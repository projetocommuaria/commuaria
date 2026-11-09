import express from "express";
import { createServer as createHttpServer } from "http";
import path from "path";
import { config as loadDotEnv } from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import {
  CURITIBA_CITY_ID,
  DEFAULT_CURITIBA_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
} from "./src/lib/supabaseTenants";
import {
  isProtectedGlobalAdminProfile,
  parseCuritibaRoleChangeInput,
} from "./src/server/adminRoleChangeValidation";
import { generateNotificationEmailHtml, ReportNotificationPayload } from "./src/server/emailService.js";

// Load ignored local secrets for development; production should inject them through its secret manager.
loadDotEnv({ path: ".env.local", quiet: true });
loadDotEnv({ quiet: true });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // In-memory log for recent notification dispatches
  const notificationDispatchLogs: Array<{
    id: string;
    timestamp: string;
    to: string;
    eventType: string;
    reportProtocol: string;
    subject: string;
  }> = [];

  // Public IBGE municipal mesh proxy. Raw official GeoJSON is cached in memory to avoid
  // repeated GitHub requests from the ADM Global boundary-import form.
  const ibgeUfCodes: Record<string, string> = {
    RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
    MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29",
    MG: "31", ES: "32", RJ: "33", SP: "35",
    PR: "41", SC: "42", RS: "43",
    MS: "50", MT: "51", GO: "52", DF: "53",
  };
  const ibgeGeoJsonCache = new Map<string, { expiresAt: number; payload: any }>();
  const ibgeGeoJsonPending = new Map<string, Promise<any>>();

  app.get("/api/ibge/state-municipalities/:uf", async (req, res) => {
    const uf = String(req.params.uf || "").trim().toUpperCase();
    const stateCode = ibgeUfCodes[uf];
    if (!stateCode) {
      return res.status(400).json({ error: "UF brasileira inválida." });
    }

    const cached = ibgeGeoJsonCache.get(uf);
    if (cached && cached.expiresAt > Date.now()) return res.json(cached.payload);

    try {
      let pending = ibgeGeoJsonPending.get(uf);
      if (!pending) {
        pending = (async () => {
          const url = `https://api.github.com/repos/tbrugz/geodata-br/contents/geojson/geojs-${stateCode}-mun.json`;
          const response = await fetch(url, {
            headers: {
              Accept: "application/vnd.github.raw+json, application/vnd.github.raw",
              "User-Agent": "Commuaria-city-boundary-import",
            },
          });
          if (!response.ok) throw new Error(`Fonte oficial indisponível (HTTP ${response.status}).`);
          const body = await response.text();
          let payload: any;
          try {
            payload = JSON.parse(body);
            if (payload?.encoding === "base64" && payload?.content) {
              payload = JSON.parse(Buffer.from(payload.content, "base64").toString("utf8"));
            }
          } catch {
            throw new Error("A resposta da fonte oficial não contém GeoJSON válido.");
          }
          if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
            throw new Error("A fonte oficial não retornou uma coleção de limites municipais.");
          }
          const safePayload = {
            type: "FeatureCollection",
            features: payload.features.filter((feature: any) =>
              feature && feature.type === "Feature" &&
              ["Polygon", "MultiPolygon"].includes(feature.geometry?.type) &&
              (feature.properties?.id || feature.id)
            ),
          };
          ibgeGeoJsonCache.set(uf, { expiresAt: Date.now() + 12 * 60 * 60 * 1000, payload: safePayload });
          return safePayload;
        })();
        ibgeGeoJsonPending.set(uf, pending);
      }
      const payload = await pending;
      return res.json(payload);
    } catch (err: any) {
      console.error(`Falha ao importar malha IBGE de ${uf}:`, err);
      return res.status(502).json({ error: err?.message || "Falha ao carregar os limites municipais oficiais." });
    } finally {
      ibgeGeoJsonPending.delete(uf);
    }
  });

  // API - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "commuaria-server", timestamp: new Date().toISOString() });
  });

  // Cross-tenant administrator action. The global admin is verified against Araucária,
  // then the server (never the browser) uses Curitiba's private service-role key.
  app.post("/api/admin/curitiba/profile-role", async (req, res) => {
    const authorization = req.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim();
    if (!accessToken) {
      return res.status(401).json({ error: "Sessão ADM Global ausente. Entre novamente em Araucária." });
    }

    const input = parseCuritibaRoleChangeInput(req.body);
    if (!input) {
      return res.status(400).json({ error: "Dados inválidos para alterar o cargo no município de Curitiba." });
    }

    const adminAuthUrl =
      process.env.COMMUARIA_ADMIN_AUTH_URL?.trim() ||
      process.env.VITE_SUPABASE_URL?.trim() ||
      DEFAULT_SUPABASE_URL;
    const adminAuthAnonKey =
      process.env.COMMUARIA_ADMIN_AUTH_ANON_KEY?.trim() ||
      process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
      DEFAULT_SUPABASE_ANON_KEY;
    if (!adminAuthUrl || !adminAuthAnonKey) {
      return res.status(503).json({ error: "A validação da sessão ADM Global não está configurada no servidor." });
    }

    try {
      const adminAuthClient = createClient(adminAuthUrl, adminAuthAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const { data: authData, error: authError } = await adminAuthClient.auth.getUser(accessToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "A sessão do administrador em Araucária expirou ou não é válida." });
      }

      const { data: databaseAdminFlag, error: databaseAdminError } = await adminAuthClient.rpc("is_global_admin");
      if (databaseAdminError || databaseAdminFlag !== true) {
        return res.status(403).json({ error: "A conta autenticada não tem permissão de ADM Global em Araucária." });
      }

      const { data: adminProfile, error: adminProfileError } = await adminAuthClient
        .from("profiles")
        .select("id,role,is_admin,email,is_blocked")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (
        adminProfileError ||
        !isProtectedGlobalAdminProfile(adminProfile) ||
        adminProfile?.is_blocked === true
      ) {
        return res.status(403).json({ error: "A conta autenticada não tem permissão de ADM Global em Araucária." });
      }

      const curitibaServiceRoleKey = process.env.SUPABASE_CURITIBA_SERVICE_ROLE_KEY?.trim();
      if (!curitibaServiceRoleKey) {
        return res.status(503).json({
          error: "A alteração administrativa de Curitiba ainda não está configurada no servidor.",
        });
      }

      const curitibaClient = createClient(DEFAULT_CURITIBA_SUPABASE_URL, curitibaServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const { data: cityRow, error: cityError } = await curitibaClient
        .from("cities")
        .select("id,is_active")
        .eq("id", CURITIBA_CITY_ID)
        .maybeSingle();
      if (cityError) throw cityError;
      if (!cityRow || cityRow.is_active !== true) {
        return res.status(409).json({ error: "Curitiba não está ativa para operações administrativas." });
      }

      const profileColumns = "id,city_id,email,role,is_admin";
      let profileById: any = null;
      if (input.profileId) {
        const { data, error } = await curitibaClient
          .from("profiles")
          .select(profileColumns)
          .eq("id", input.profileId)
          .maybeSingle();
        if (error) throw error;
        profileById = data;
      }

      let profileByEmail: any = null;
      if (input.email) {
        const escapedEmail = input.email.replace(/[\\%_]/g, "\\$&");
        const { data, error } = await curitibaClient
          .from("profiles")
          .select(profileColumns)
          .ilike("email", escapedEmail)
          .limit(2);
        if (error) throw error;
        if (Array.isArray(data) && data.length > 1) {
          return res.status(409).json({ error: "O e-mail corresponde a mais de um perfil; nenhuma alteração foi aplicada." });
        }
        profileByEmail = Array.isArray(data) ? data[0] || null : null;
      }

      if (profileById && profileByEmail && profileById.id !== profileByEmail.id) {
        return res.status(409).json({ error: "O identificador e o e-mail apontam para perfis diferentes; nenhuma alteração foi aplicada." });
      }
      const targetProfile = profileById || profileByEmail;
      if (!targetProfile || targetProfile.city_id?.trim() !== CURITIBA_CITY_ID) {
        return res.status(404).json({ error: "Perfil não encontrado em Curitiba; nenhuma alteração foi aplicada." });
      }
      if (isProtectedGlobalAdminProfile(targetProfile)) {
        return res.status(403).json({ error: "O cargo de ADM Global está protegido e não pode ser alterado por esta operação." });
      }

      // Compare-and-swap the authorization-relevant columns so a profile concurrently
      // promoted to global admin cannot slip between the check and the update.
      let updateQuery: any = curitibaClient
        .from("profiles")
        .update({
          role: input.role,
          assigned_category: input.assignedCategory,
        })
        .eq("id", targetProfile.id)
        .eq("city_id", CURITIBA_CITY_ID);
      updateQuery = targetProfile.role === null
        ? updateQuery.is("role", null)
        : updateQuery.eq("role", targetProfile.role);
      updateQuery = targetProfile.is_admin === null
        ? updateQuery.is("is_admin", null)
        : updateQuery.eq("is_admin", targetProfile.is_admin);
      updateQuery = targetProfile.email === null
        ? updateQuery.is("email", null)
        : updateQuery.eq("email", targetProfile.email);

      const { data: updatedProfile, error: updateError } = await updateQuery
        .select("id,city_id,email,role,assigned_category,is_admin")
        .maybeSingle();
      if (updateError) throw updateError;
      if (
        !updatedProfile ||
        updatedProfile.city_id?.trim() !== CURITIBA_CITY_ID ||
        updatedProfile.role !== input.role ||
        updatedProfile.assigned_category !== input.assignedCategory ||
        updatedProfile.is_admin === true
      ) {
        return res.status(409).json({ error: "Não foi possível confirmar o cargo atualizado em Curitiba." });
      }

      return res.json({
        success: true,
        profile: {
          id: updatedProfile.id,
          city_id: updatedProfile.city_id,
          email: updatedProfile.email,
          role: updatedProfile.role,
          assigned_category: updatedProfile.assigned_category,
          is_admin: updatedProfile.is_admin,
        },
      });
    } catch (error: any) {
      console.error("Erro na alteração administrativa de cargo em Curitiba:", error?.code || error?.message || "falha desconhecida");
      return res.status(500).json({ error: "O servidor não conseguiu atualizar o cargo em Curitiba." });
    }
  });

  // API - Send Notification Email & Multiplatform Dispatch Endpoint
  app.post("/api/notifications/send-email", async (req, res) => {
    try {
      const payload: ReportNotificationPayload = req.body;

      if (!payload || !payload.to || !payload.report || !payload.eventType) {
        return res.status(400).json({
          success: false,
          error: "Dados incompletos: 'to', 'eventType' e 'report' são obrigatórios.",
        });
      }

      const { subject, html, text } = generateNotificationEmailHtml(payload);
      const protocol = payload.report.protocol || payload.report.id || "#0000";

      // Log dispatch for administrative inspection and delivery proof
      const logEntry = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        to: payload.to,
        eventType: payload.eventType,
        reportProtocol: protocol,
        subject: subject,
      };
      notificationDispatchLogs.unshift(logEntry);
      if (notificationDispatchLogs.length > 100) {
        notificationDispatchLogs.pop();
      }

      console.log(`\n======================================================`);
      console.log(`📧 [COMMUÁRIA NOTIFICAÇÃO EXTERNA - E-MAIL & PUSH]`);
      console.log(`Para: ${payload.to} (${payload.userName || 'Cidadão'})`);
      console.log(`Evento: ${payload.eventType.toUpperCase()}`);
      console.log(`Ocorrência: ${protocol} - ${payload.report.title}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Data/Hora: ${new Date().toLocaleString("pt-BR")}`);
      console.log(`======================================================\n`);

      return res.json({
        success: true,
        message: "Notificação externa registrada e despachada com sucesso.",
        deliveryId: logEntry.id,
        to: payload.to,
        eventType: payload.eventType,
        subject,
        timestamp: logEntry.timestamp,
        simulated: true, // Indicates successful dispatch pipeline
      });
    } catch (err: any) {
      console.error("Erro no processamento da notificação externa:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Falha interna ao despachar notificação.",
      });
    }
  });

  // API - Get recent notification logs (for diagnostics/audit)
  app.get("/api/notifications/logs", (req, res) => {
    res.json({
      success: true,
      total: notificationDispatchLogs.length,
      logs: notificationDispatchLogs,
    });
  });

  const httpServer = createHttpServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Commuária server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

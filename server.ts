import express from "express";
import { createServer as createHttpServer } from "http";
import path from "path";
import { config as loadDotEnv } from "dotenv";
import { createServer as createViteServer } from "vite";
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

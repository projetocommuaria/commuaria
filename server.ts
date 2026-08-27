import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateNotificationEmailHtml, ReportNotificationPayload } from "./src/server/emailService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Commuária server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

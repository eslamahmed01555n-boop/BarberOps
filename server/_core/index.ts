import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import {
  addWalkIn,
  assignWalkIn,
  getDashboard,
  getDelayAlerts,
  getDueReminders,
  getReconciliation,
  recordReconciliation,
  updateBooking,
  hydrateStore,
  type BookingAction,
} from "../barber-store";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { checkDbReady, closeDb } from "../db";

async function startServer() {
  await hydrateStore();
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/ready", async (_req, res) => {
    const persistence = process.env.PERSISTENCE_MODE ?? "demo-memory";
    const requiresDatabase = process.env.NODE_ENV === "production" || persistence === "postgres";
    const databaseReady = requiresDatabase ? await checkDbReady() : true;
    return res.status(databaseReady ? 200 : 503).json({
      status: databaseReady ? "ok" : "not_ready",
      persistence,
      demoMode: process.env.DEMO_MODE !== "false",
      database: databaseReady ? "ok" : "unavailable",
    });
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  // Small REST contract for n8n and other operational integrations.
  app.get("/api/ops/dashboard", (_req, res) => res.json(getDashboard()));
  app.get("/api/ops/reminders/due", (_req, res) => res.json({ items: getDueReminders() }));
  app.get("/api/ops/alerts/delays", (_req, res) => res.json({ items: getDelayAlerts() }));
  app.get("/api/ops/reconcile/today", (_req, res) => res.json(getReconciliation()));
  app.post("/api/ops/bookings/:bookingId/status", async (req, res) => {
    const action = req.body?.action as BookingAction;
    const allowed: BookingAction[] = ["confirm", "arrived", "start", "complete", "extend", "delay", "no_show", "cancel", "reschedule"];
    if (!allowed.includes(action)) return res.status(400).json({ error: "Unsupported booking action" });
    try { return res.json(await updateBooking(req.params.bookingId, action)); }
    catch (error) { return res.status(404).json({ error: error instanceof Error ? error.message : "Booking not found" }); }
  });
  app.post("/api/ops/walk-ins", async (req, res) => {
    const { customerName, phone, service, barberPreference } = req.body ?? {};
    if (!customerName || !phone || !service) return res.status(400).json({ error: "customerName, phone and service are required" });
    return res.status(201).json(await addWalkIn({ customerName, phone, service, barberPreference }));
  });
  app.post("/api/ops/walk-ins/:queueId/assign", async (req, res) => {
    const { barberId } = req.body ?? {};
    if (!barberId) return res.status(400).json({ error: "barberId is required" });
    try { return res.json(await assignWalkIn(req.params.queueId, barberId)); }
    catch (error) { return res.status(404).json({ error: error instanceof Error ? error.message : "Queue entry not found" }); }
  });
  app.post("/api/ops/reconcile/commit", async (req, res) => res.json(await recordReconciliation(req.body?.note)));
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received; draining connections`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

startServer().catch(error => { console.error(error); process.exit(1); });

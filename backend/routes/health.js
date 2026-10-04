import { Router } from "express";
import mongoose from "mongoose";
const router = Router();
router.get("/healthz", (_req, res) => res.json({ status: "ok", service: "stocksphere-api", uptime: Math.round(process.uptime()) }));
router.get("/readyz", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", database: mongoose.connection.readyState });
});
export default router;

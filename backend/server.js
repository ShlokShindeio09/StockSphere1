import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import marketRouter from "./routes/market.js";
import tradingRouter from "./routes/trading.js";
import userRouter from "./routes/user.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters");
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({ origin: (origin, cb) => !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS origin not allowed")) }));
app.use(express.json({ limit: "100kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000), limit: Number(process.env.RATE_LIMIT_MAX || 300), standardHeaders: "draft-8", legacyHeaders: false }));

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", marketRouter, tradingRouter, userRouter);
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: status === 500 ? "Internal server error" : err.message });
});

const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, "0.0.0.0", () => console.log(`StockSphere API listening on port ${PORT}`));

async function startDb() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 50), minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5), maxIdleTimeMS: 30000, retryWrites: true });
  console.log("MongoDB connected");
}
startDb().catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });

const shutdown = async signal => {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;

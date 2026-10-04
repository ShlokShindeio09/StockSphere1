import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import Stock from "../models/Stock.js";
import Alert from "../models/Alert.js";
import { requireAuth } from "../middleware.js";
const router = Router();
router.use(requireAuth);
const getUser = req => User.findById(req.userId);

router.get("/watchlist", async (req, res) => { const u = await getUser(req); const stocks = await Stock.find({ symbol: { $in: u.watchlist } }).lean(); res.json(u.watchlist.map(s => stocks.find(x => x.symbol === s)).filter(Boolean)); });
router.post("/watchlist/:symbol", async (req, res) => { const symbol = req.params.symbol.toUpperCase(), stock = await Stock.findOne({ symbol }).lean(); if (!stock) return res.status(404).json({ error: "Stock not found" }); const u = await getUser(req); if (!u.watchlist.includes(symbol)) u.watchlist.unshift(symbol); await u.save(); const stocks = await Stock.find({ symbol: { $in: u.watchlist } }).lean(); res.json(u.watchlist.map(s => stocks.find(x => x.symbol === s)).filter(Boolean)); });
router.delete("/watchlist/:symbol", async (req, res) => { const u = await getUser(req); u.watchlist = u.watchlist.filter(s => s !== req.params.symbol.toUpperCase()); await u.save(); const stocks = await Stock.find({ symbol: { $in: u.watchlist } }).lean(); res.json(u.watchlist.map(s => stocks.find(x => x.symbol === s)).filter(Boolean)); });
router.get("/alerts", async (req, res) => res.json(await Alert.find({ userId: req.userId }).sort({ createdAt: -1 }).lean()));
router.post("/alerts", async (req, res) => { const parsed = z.object({ symbol: z.string().trim().min(1).max(20), condition: z.enum(["ABOVE", "BELOW"]), targetPrice: z.number().nonnegative() }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Invalid alert" }); const { symbol, condition, targetPrice } = parsed.data, stock = await Stock.findOne({ symbol: symbol.toUpperCase() }); if (!stock) return res.status(404).json({ error: "Stock not found" }); const triggered = condition === "ABOVE" ? stock.price >= targetPrice : stock.price <= targetPrice; res.status(201).json(await Alert.create({ userId: req.userId, symbol: stock.symbol, name: stock.name, condition, targetPrice, currentPrice: stock.price, triggered })); });
router.delete("/alerts/:id", async (req, res) => { const deleted = await Alert.findOneAndDelete({ _id: req.params.id, userId: req.userId }); if (!deleted) return res.status(404).json({ error: "Alert not found" }); res.sendStatus(204); });
export default router;

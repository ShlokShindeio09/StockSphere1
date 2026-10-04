import { Router } from "express";
import { z } from "zod";
import Stock from "../models/Stock.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware.js";
const router = Router();

export async function getPortfolio(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  const orders = await Order.find({ userId }).sort({ createdAt: 1 }).lean();
  const stocks = await Stock.find().lean();
  const map = new Map();
  for (const order of orders) {
    const p = map.get(order.symbol) || { shares: 0, invested: 0 };
    if (order.type === "BUY") { p.shares += order.quantity; p.invested += order.total; }
    else { p.shares -= order.quantity; p.invested -= order.total; }
    map.set(order.symbol, p);
  }
  const holdings = [];
  for (const [symbol, p] of map) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || p.shares <= 0) continue;
    const value = Number((p.shares * stock.price).toFixed(2));
    const profitLoss = Number((value - p.invested).toFixed(2));
    holdings.push({ symbol, name: stock.name, shares: p.shares, averagePrice: Number((p.invested / p.shares).toFixed(2)), currentPrice: stock.price, invested: Number(p.invested.toFixed(2)), value, profitLoss, profitLossPercent: p.invested ? Number((profitLoss / p.invested * 100).toFixed(2)) : 0 });
  }
  const invested = holdings.reduce((s, h) => s + h.invested, 0), value = holdings.reduce((s, h) => s + h.value, 0), profitLoss = value - invested;
  return { cash: Number(user.cash.toFixed(2)), invested: Number(invested.toFixed(2)), value: Number(value.toFixed(2)), profitLoss: Number(profitLoss.toFixed(2)), profitLossPercent: invested ? Number((profitLoss / invested * 100).toFixed(2)) : 0, holdings };
}

router.use(requireAuth);
router.get("/portfolio", async (req, res) => res.json(await getPortfolio(req.userId)));
router.get("/orders", async (req, res) => res.json((await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).lean()).map(o => ({ ...o, id: o._id }))));

router.post("/orders", async (req, res) => {
  const parsed = z.object({ symbol: z.string().trim().min(1).max(20), type: z.enum(["BUY", "SELL"]), quantity: z.number().int().positive().max(1000000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order" });
  const { symbol, type, quantity } = parsed.data;
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  const user = await User.findById(req.userId);
  if (!stock || !user) return res.status(404).json({ error: "Stock or user not found" });
  const total = Number((quantity * stock.price).toFixed(2));
  const portfolio = await getPortfolio(req.userId);
  const holding = portfolio.holdings.find(h => h.symbol === stock.symbol);
  if (type === "BUY" && total > user.cash) return res.status(400).json({ error: "Not enough virtual cash for this order" });
  if (type === "SELL" && (!holding || holding.shares < quantity)) return res.status(400).json({ error: "You do not own enough shares to sell" });
  const order = await Order.create({ userId: user._id, symbol: stock.symbol, name: stock.name, type, quantity, price: stock.price, total });
  user.cash = Number((user.cash + (type === "BUY" ? -total : total)).toFixed(2));
  await user.save();
  res.status(201).json({ id: order._id, symbol: order.symbol, name: order.name, type: order.type, quantity: order.quantity, price: order.price, total: order.total, createdAt: order.createdAt });
});
export default router;

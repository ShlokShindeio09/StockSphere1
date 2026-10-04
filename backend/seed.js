import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Stock from "./models/Stock.js";
import News from "./models/News.js";
import Order from "./models/Order.js";
import Alert from "./models/Alert.js";
import User from "./models/User.js";
import stocks from "./data/stocks.json" with { type: "json" };
import news from "./data/news.json" with { type: "json" };

await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stocksphere");
await Promise.all([Stock.deleteMany({}), News.deleteMany({}), Order.deleteMany({}), Alert.deleteMany({}), User.deleteMany({})]);
await Promise.all([Stock.insertMany(stocks), News.insertMany(news)]);
const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD || "Demo@12345", 12);
const user = await User.create({ name: "Demo User", email: process.env.DEMO_EMAIL || "demo@stocksphere.local", passwordHash, cash: 1000000, watchlist: ["TCS", "RELIANCE", "HDFCBANK", "SUNPHARMA"] });
await Order.insertMany([
  { userId: user._id, symbol: "RELIANCE", name: "Reliance Industries", type: "BUY", quantity: 10, price: 2945.2, total: 29452, createdAt: "2026-09-22T10:14:00.000Z" },
  { userId: user._id, symbol: "TCS", name: "Tata Consultancy Services", type: "BUY", quantity: 4, price: 3772, total: 15088, createdAt: "2026-09-21T08:42:00.000Z" },
  { userId: user._id, symbol: "INFY", name: "Infosys", type: "BUY", quantity: 8, price: 1844.5, total: 14756, createdAt: "2026-09-19T13:05:00.000Z" }
]);
await Alert.insertMany([
  { userId: user._id, symbol: "RELIANCE", name: "Reliance Industries", condition: "ABOVE", targetPrice: 3200, currentPrice: 3152.4, triggered: false },
  { userId: user._id, symbol: "TATAMOTORS", name: "Tata Motors", condition: "BELOW", targetPrice: 820, currentPrice: 861.25, triggered: false },
  { userId: user._id, symbol: "INFY", name: "Infosys", condition: "ABOVE", targetPrice: 1900, currentPrice: 1901.4, triggered: true }
]);
console.log(`Seeded. Demo login: ${user.email} / ${process.env.DEMO_PASSWORD || "Demo@12345"}`);
await mongoose.disconnect();

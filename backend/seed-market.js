import "dotenv/config";
import mongoose from "mongoose";
import Stock from "./models/Stock.js";
import News from "./models/News.js";
import stocks from "./data/stocks.json" with { type: "json" };
import news from "./data/news.json" with { type: "json" };

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI before seeding market data");
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  const [stockResult, newsResult] = await Promise.all([
    Stock.bulkWrite(stocks.map(stock => ({
      updateOne: {
        filter: { symbol: stock.symbol },
        update: { $set: stock },
        upsert: true,
      },
    }))),
    News.bulkWrite(news.map(item => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: item },
        upsert: true,
      },
    }))),
  ]);

  console.log(`Market data loaded: ${stocks.length} stocks and ${news.length} news items.`);
  console.log(`Stocks inserted: ${stockResult.upsertedCount}; news inserted: ${newsResult.upsertedCount}.`);
} finally {
  await mongoose.disconnect();
}
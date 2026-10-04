import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  symbol: { type: String, required: true, uppercase: true, index: true },
  name: String,
  type: { type: String, enum: ["BUY", "SELL"], required: true },
  quantity: { type: Number, min: 1, required: true },
  price: { type: Number, min: 0 },
  total: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
});
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model("Order", schema);

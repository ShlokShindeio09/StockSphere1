import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  symbol: { type: String, required: true, uppercase: true },
  name: String,
  condition: { type: String, enum: ["ABOVE", "BELOW"], required: true },
  targetPrice: { type: Number, min: 0, required: true },
  currentPrice: Number,
  triggered: Boolean
}, { timestamps: true });
export default mongoose.model("Alert", schema);

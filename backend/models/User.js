import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  cash: { type: Number, default: 1000000, min: 0 },
  watchlist: { type: [String], default: ["TCS", "RELIANCE", "HDFCBANK", "SUNPHARMA"] }
}, { timestamps: true });
export default mongoose.model("User", schema);

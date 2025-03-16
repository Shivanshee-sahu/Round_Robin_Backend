import mongoose from "mongoose";
const ClaimSchema = new mongoose.Schema({
  ip: { type: String, required: true },

  code: { type: String, required: true }, // Removed unique constraint to allow multiple claims for the same code
  discount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now } // Removed isClaimed as it's not needed here
});

export default mongoose.model("Claim", ClaimSchema);

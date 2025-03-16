import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discount: { type: Number, required: true },
  isClaimed: { type: Boolean, default: false },
  expiryDate: { type: Date, required: false }, // Optional expiry date
});

export default mongoose.model("Coupon", CouponSchema);

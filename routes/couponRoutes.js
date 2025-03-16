import express from "express";
import Coupon from "../models/Coupon.js";
import Claim from "../models/Claim.js";
import mongoose from "mongoose"; // Import mongoose
const router = express.Router();
const COOLDOWN_TIME = 10 * 60 * 1000; // 10 minutes cooldown

// Add a new coupon
router.post("/", async (req, res) => {
  try {
    const { code, discount } = req.body;

    if (!code || !discount) {
      return res
        .status(400)
        .json({ message: "Coupon code and discount are required." });
    }

    // Check for duplicate coupon
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists." });
    }

    const newCoupon = new Coupon({ code, discount, isClaimed: false }); // Default to not claimed
    await newCoupon.save();

    return res
      .status(201)
      .json({ message: "Coupon added successfully!", coupon: newCoupon });
  } catch (error) {
    console.error("Error adding coupon:", error);
    return res.status(500).json({ message: `Error: ${error.message}` });
  }
});

// Middleware to get user's IP address
const getUserIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress
  );
};

// Claim a coupon
// Assuming you have a model for tracking the last assigned index
const Settings = mongoose.model("Settings", {
  lastAssignedCouponIndex: { type: Number, default: 0 },
});

router.get("/claim", async (req, res) => {
  try {
      const userIP = getUserIP(req);
      const COOLDOWN_TIME = 60000;

      // Fetch settings to get the last assigned index
      let settings = await Settings.findOne();
      if (!settings) {
          settings = await Settings.create({}); // Create settings if they don't exist
      }

      // Fetch all available coupons
      const availableCoupons = await Coupon.find({ isClaimed: false }).sort({ _id: 1 });

      if (availableCoupons.length === 0) {
          return res.status(404).json({ message: "No coupons available." });
      }

      // Get the next coupon using the round-robin index
      const couponIndex = settings.lastAssignedCouponIndex % availableCoupons.length;
      const coupon = availableCoupons[couponIndex];

      // Check cooldown
      const lastClaim = await Claim.findOne({ ip: userIP }).sort({ timestamp: -1 });

      if (lastClaim && Date.now() - lastClaim.timestamp < COOLDOWN_TIME) {
          const remainingTime = Math.ceil((COOLDOWN_TIME - (Date.now() - lastClaim.timestamp)) / 1000);
          return res.status(429).json({ message: `Please wait ${remainingTime} seconds before claiming again.` });
      }

      // Mark coupon as claimed
      coupon.isClaimed = true;
      coupon.claimedBy = userIP;
      await coupon.save();

      // Update the last assigned index
      settings.lastAssignedCouponIndex = (settings.lastAssignedCouponIndex + 1) % availableCoupons.length;
      await settings.save();

      // Log the claim
      await Claim.create({
          ip: userIP,
          code: coupon.code,
          discount: coupon.discount,
          timestamp: new Date(),
      });

      return res.json({ message: "Coupon claimed successfully!", coupon: coupon.code,Discount:coupon.discount });
  } catch (error) {
      console.error("Error claiming coupon:", error);
      return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// Edit coupon discount and availability
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { discount, isClaimed } = req.body;

    if (discount === undefined && isClaimed === undefined) {
      return res.status(400).json({
        message: "Discount or isClaimed status is required.",
      });
    }

    // Prepare the update object dynamically
    const updateObject = {};
    if (discount !== undefined) updateObject.discount = discount;
    if (isClaimed !== undefined) updateObject.isClaimed = isClaimed;

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    return res.status(200).json({
      message: "Coupon updated successfully!",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// Endpoint to update coupon availability
router.put("/:id/availability", async (req, res) => {
    try {
      const { id } = req.params;
      const { isClaimed } = req.body;
  
      if (typeof isClaimed !== "boolean") {
        return res.status(400).json({ message: "isClaimed must be a boolean." });
      }
  
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        { $set: { isClaimed } },
        { new: true, runValidators: true }
      );
  
      if (!updatedCoupon) {
        return res.status(404).json({ message: "Coupon not found." });
      }
  
      return res.status(200).json({
        message: "Coupon availability updated successfully!",
        coupon: updatedCoupon,
      });
    } catch (error) {
      console.error(`Error updating coupon availability for ID: ${req.params.id}`, error);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  });
  

// Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();
    return res.status(200).json(coupons);
  } catch (error) {
    console.error("Error getting coupons:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

export default router;

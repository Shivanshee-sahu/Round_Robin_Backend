import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Coupon from "../models/Coupon.js";
import Claim from "../models/Claim.js";
import authMiddleware from "../middleware/authMiddleware.js";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Predefined Admin Credentials (Replace with DB if needed)
const adminUser = {
    username: process.env.ADMIN_USERNAME || "admin123",
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10),
};

// Middleware to Verify Admin Authentication
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.admin = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid or Expired Token" });
    }
};

// ✅ Admin Login
router.post("/login", (req, res) => {
    try {
        const { username, password } = req.body;

        if (username !== adminUser.username || !bcrypt.compareSync(password, adminUser.password)) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ message: "Login Successful", token });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ Protected Admin Dashboard
router.get("/dashboard", verifyAdmin, (req, res) => {
    res.json({ message: "Welcome to the Admin Dashboard" });
});

// ✅ View All Coupons
router.get("/coupons", verifyAdmin, async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: "Error fetching coupons" });
    }
});

// ✅ Add New Coupon
router.post("/coupons", verifyAdmin, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: "Coupon code is required" });

        const newCoupon = new Coupon({ code, isClaimed: false });
        await newCoupon.save();
        res.status(201).json({ message: "Coupon added successfully", coupon: newCoupon });
    } catch (error) {
        res.status(500).json({ message: "Error adding coupon" });
    }
});

// ✅ Toggle Coupon Availability
router.put("/coupons/:id", verifyAdmin, async (req, res) => {
    try {
        const { isClaimed } = req.body;
        const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, { isClaimed }, { new: true });

        if (!updatedCoupon) return res.status(404).json({ message: "Coupon not found" });

        res.json({ message: "Coupon updated successfully", updatedCoupon });
    } catch (error) {
        res.status(500).json({ message: "Error updating coupon" });
    }
});

// ✅ Delete Coupon
router.delete("/coupons/:id", verifyAdmin, async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!deletedCoupon) return res.status(404).json({ message: "Coupon not found" });

        res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting coupon" });
    }
});

// ✅ View Claim History
router.get("/claims", verifyAdmin, async (req, res) => {
    try {
        const claims = await Claim.find().sort({ timestamp: -1 });
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: "Error fetching claims" });
    }
});

// ✅ Assign Coupon in Round-Robin Manner
router.post("/claim", async (req, res) => {
    try {
        const userIP = req.ip; // Get user's IP address
        const userSession = req.headers["user-agent"]; // Use user-agent as a browser session identifier
        const cooldownPeriod = 60 * 60 * 1000; // 1-hour cooldown

        // Check if user already claimed within cooldown
        const lastClaim = await Claim.findOne({ ip: userIP }).sort({ timestamp: -1 });

        if (lastClaim && new Date() - lastClaim.timestamp < cooldownPeriod) {
            return res.status(429).json({ message: "You can claim only once per hour." });
        }

        // Find the next available coupon
        const coupon = await Coupon.findOne({ isClaimed: false }).sort({ _id: 1 });

        if (!coupon) {
            return res.status(404).json({ message: "No coupons available." });
        }

        // Mark coupon as claimed
        coupon.isClaimed = true;
        await coupon.save();

        // Store claim record
        const newClaim = new Claim({ couponCode: coupon.code, ip: userIP, session: userSession, timestamp: new Date() });
        await newClaim.save();

        res.json({ message: "Coupon claimed successfully!", coupon: coupon.code });
    } catch (error) {
        res.status(500).json({ message: "Error processing claim" });
    }
});

export default router;

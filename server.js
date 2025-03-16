import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import couponRoutes from "./routes/couponRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";  
import connectDB from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "https://round-robin-frontend-one.vercel.app", credentials: true }));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// API Routes
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);  // ✅ Use user routes

app.get("/", (req, res) => {
  res.send("Round-Robin Coupon Distribution API is Running...");
});

// Start the Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

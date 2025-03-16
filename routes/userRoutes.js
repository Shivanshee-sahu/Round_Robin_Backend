import express from "express";

const router = express.Router();

// Dummy route for testing
router.get("/", (req, res) => {
  res.json({ message: "User route is working!" });
});

export default router;

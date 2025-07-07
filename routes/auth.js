import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin credentials
  if (email === "admin@example.com" && password === "admin123") {
    return res.json({ email, role: "admin" });
  }

  // Check user in DB
  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ email: user.email, role: user.role });
});

export default router;

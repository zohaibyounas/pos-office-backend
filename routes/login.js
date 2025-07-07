// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin login
  if (email === "admin@example.com" && password === "admin123") {
    return res.json({ email, role: "admin" });
  }

  // Check in DB for other users
  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({ email: user.email, role: user.role });
});

module.exports = router;

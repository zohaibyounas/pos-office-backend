import express from "express";
import User from "../models/User.js"; // ✅ path must match filename and case exactly

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.post("/", async (req, res) => {
  const { email, password, role } = req.body;
  const newUser = new User({ email, password, role });
  await newUser.save();
  res.status(201).json(newUser);
});

// Update user
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { email, password, role } = req.body;
  const updated = await User.findByIdAndUpdate(
    id,
    { email, password, role },
    { new: true }
  );
  res.json(updated);
});

// Delete user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: "User deleted" });
});

export default router;

import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CREATE new user
router.post("/", async (req, res) => {
  try {
    const { email, password, role, phone, cnic, monthlySalary, barcode } =
      req.body;

    const newUser = new User({
      email,
      password,
      role,
      phone,
      cnic,
      monthlySalary,
      barcode, // ✅ store barcode
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, role, phone, cnic, monthlySalary, barcode } =
      req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { email, password, role, phone, cnic, monthlySalary, barcode }, // ✅ add barcode
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET user by barcode (only if role is "user")
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    // Removed role filtering — just find by barcode
    const user = await User.findOne({ barcode });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ return only required fields (email, role, barcode, etc.)
    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      barcode: user.barcode,
      phone: user.phone,
      cnic: user.cnic,
      monthlySalary: user.monthlySalary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

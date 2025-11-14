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
    const {
      email,
      password,
      role,
      phone,
      cnic,
      monthlySalary,
      barcode,
      commissionPercent,
      commissionEarned,
    } = req.body;

    console.log("Creating user with commissionPercent:", commissionPercent);

    const newUser = new User({
      email,
      password,
      role,
      phone,
      cnic,
      monthlySalary,
      barcode,
      commissionPercent: commissionPercent || 0,
      commissionEarned: commissionEarned || 0,
    });

    await newUser.save();

    // Make sure to return the complete user with commissionPercent
    const savedUser = await User.findById(newUser._id);
    console.log(
      "User created with commissionPercent:",
      savedUser.commissionPercent
    );

    res.status(201).json(savedUser);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE user - REMOVE THE DUPLICATE BELOW THIS ONE!
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      password,
      role,
      phone,
      cnic,
      monthlySalary,
      barcode,
      commissionPercent,
      commissionEarned,
    } = req.body;

    console.log("Updating user with commissionPercent:", commissionPercent);
    console.log("Full update data:", req.body);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        email,
        password,
        role,
        phone,
        cnic,
        monthlySalary,
        barcode,
        commissionPercent: commissionPercent || 0,
        commissionEarned: commissionEarned || 0,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(
      "User updated with commissionPercent:",
      updatedUser.commissionPercent
    );
    console.log("Full updated user:", updatedUser);

    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
});

// ❌ DELETE THIS DUPLICATE PUT ROUTE - IT'S CAUSING THE ISSUE!
// ✅ UPDATE user commission (add commission to earned amount)
router.put("/:id/commission", async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionAmount } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $inc: { commissionEarned: commissionAmount },
      },
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ RESET user commission (set earned commission to 0)
router.put("/:id/reset-commission", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        commissionEarned: 0,
      },
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET user by barcode
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;
    const user = await User.findOne({ barcode });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      barcode: user.barcode,
      phone: user.phone,
      cnic: user.cnic,
      monthlySalary: user.monthlySalary,
      commissionPercent: user.commissionPercent,
      commissionEarned: user.commissionEarned,
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

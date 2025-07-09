import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET all users
router.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// CREATE new user
router.post("/", async (req, res) => {
  const {
    email,
    password,
    role,
    phone,
    cnic,
    monthlySalary,
    commissionEnabled,
    commissionRate,
  } = req.body;

  const newUser = new User({
    email,
    password,
    role,
    phone,
    cnic,
    monthlySalary,
    commissionEnabled,
    commissionRate,
  });

  await newUser.save();
  res.status(201).json(newUser);
});

// UPDATE user
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  const {
    email,
    password,
    role,
    phone,
    cnic,
    monthlySalary,
    commissionEnabled,
    commissionRate,
  } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      email,
      password,
      role,
      phone,
      cnic,
      monthlySalary,
      commissionEnabled,
      commissionRate,
    },
    { new: true }
  );

  res.json(updatedUser);
});

// DELETE user
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: "User deleted" });
});

export default router;

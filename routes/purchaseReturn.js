import express from "express";
import PurchaseReturn from "../models/purchaseReturn.js";

const router = express.Router();

// GET all purchase returns
router.get("/", async (req, res) => {
  const returns = await PurchaseReturn.find();
  res.json(returns);
});

// POST new return
router.post("/", async (req, res) => {
  try {
    const newReturn = new PurchaseReturn(req.body);
    await newReturn.save();
    res.status(201).json(newReturn);
  } catch (err) {
    res.status(500).json({ error: "Failed to save return" });
  }
});

// DELETE a return
router.delete("/:id", async (req, res) => {
  await PurchaseReturn.findByIdAndDelete(req.params.id);
  res.json({ message: "Return deleted" });
});

router.put("/:id", async (req, res) => {
  const updated = await PurchaseReturn.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
});

export default router;

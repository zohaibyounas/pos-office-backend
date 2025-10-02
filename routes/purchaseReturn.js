import express from "express";
import PurchaseReturn from "../models/purchaseReturn.js";
import Product from "../models/Product.js";

const router = express.Router();

// GET all purchase returns
router.get("/", async (req, res) => {
  const returns = await PurchaseReturn.find().populate("products.productId");
  res.json(returns);
});

// POST new return
router.post("/", async (req, res) => {
  try {
    const newReturn = new PurchaseReturn(req.body);
    await newReturn.save();

    // 🔻 Decrease stock for returned products
    for (const item of req.body.products) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock = Math.max(0, (product.stock || 0) - item.quantity);
        await product.save();
      }
    }

    res.status(201).json(newReturn);
  } catch (err) {
    console.error("Error saving return:", err);
    res.status(500).json({ error: "Failed to save return" });
  }
});

// DELETE a return
router.delete("/:id", async (req, res) => {
  await PurchaseReturn.findByIdAndDelete(req.params.id);
  res.json({ message: "Return deleted" });
});

// UPDATE a return
router.put("/:id", async (req, res) => {
  const updated = await PurchaseReturn.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
});

export default router;

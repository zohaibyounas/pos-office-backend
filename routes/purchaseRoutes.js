import express from "express";
import {
  getAllPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchase,
} from "../controllers/purchaseController.js";

import Purchase from "../models/Purchase.js"; // make sure this path is correct

const router = express.Router();
router.get("/report", async (req, res) => {
  try {
    const { startDate, endDate, supplier, paymentType } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    if (supplier) {
      filter.supplier = supplier;
    }

    if (paymentType) {
      filter.paymentType = paymentType;
    }

    const purchases = await Purchase.find(filter).sort({ createdAt: -1 });
    // console.log("Found Purchases:", purchases);

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + (p.grandTotal || 0),
      0
    );
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paid || 0), 0);
    const totalDiscount = purchases.reduce(
      (sum, p) => sum + (p.discount || 0),
      0
    );

    res.json({
      purchases,
      summary: {
        totalPurchases,
        totalPaid,
        totalDiscount,
        count: purchases.length,
      },
    });
  } catch (err) {
    console.error("Purchases report error:", err);
    res.status(500).json({ error: "Failed to fetch purchases report" });
  }
});
// Existing CRUD routes
router.get("/", getAllPurchases);
router.get("/:id", getPurchase);
router.post("/", createPurchase);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

// ✅ New: Get filtered purchases report

export default router;

// routes/purchaseroute.js
import express from "express";
import multer from "multer";

import {
  getAllPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchase,
  addPayment,
} from "../controllers/purchaseController.js";

import Purchase from "../models/Purchase.js";

const router = express.Router();

// ✅ Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Report route
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

    if (supplier) filter.supplier = supplier;
    if (paymentType) filter.paymentType = paymentType;

    const purchases = await Purchase.find(filter).sort({ createdAt: -1 });

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

// ✅ CRUD routes
router.get("/", getAllPurchases);
router.get("/:id", getPurchase);

router.post("/", upload.single("billImage"), createPurchase);
router.put("/:id", upload.single("billImage"), updatePurchase);
router.delete("/:id", deletePurchase);

// ✅ Add payment route
router.post("/:id/payments", addPayment);

export default router;

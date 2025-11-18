// routes/purchaseroute.js - UPDATED
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
import Purchase from "../models/Purchase.js"; // ADD THIS IMPORT

const router = express.Router();

// ✅ Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Report route - UPDATED for new fields
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
      (sum, p) => sum + (p.totalCost || 0), // Use totalCost instead of totalBill
      0
    );
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paid || 0), 0);
    const totalQuantity = purchases.reduce(
      (sum, p) => sum + (p.totalPurchaseQty || 0),
      0
    );

    res.json({
      purchases,
      summary: {
        totalPurchases,
        totalPaid,
        totalQuantity,
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
router.post("/", upload.array("billImages", 10), createPurchase);
router.put("/:id", upload.single("billImage"), updatePurchase);
router.delete("/:id", deletePurchase);

// ✅ Add payment route
router.post("/:id/payments", addPayment);

export default router;

import express from "express";
import Sale from "../models/Sale.js";

const router = express.Router();

// Get filtered sales report
router.get("/api/sales/report", async (req, res) => {
  try {
    const { startDate, endDate, customer, paymentType } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    if (customer) {
      filter.customer = customer;
    }

    if (paymentType) {
      filter.paymentType = paymentType;
    }

    const sales = await Sale.find(filter).sort({ createdAt: -1 });

    const totalSales = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (s.paid || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);

    res.json({
      sales,
      summary: {
        totalSales,
        totalPaid,
        totalDiscount,
        count: sales.length,
      },
    });
  } catch (err) {
    console.error("Sales report error:", err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

export default router;

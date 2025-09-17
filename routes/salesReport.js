import express from "express";
import Sale from "../models/Sale.js";

const router = express.Router();

// --------------------
// Get filtered sales report
// --------------------
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

// --------------------
// Edit product inside a sale
// --------------------
router.put("/api/sales/:saleId/products/:productId", async (req, res) => {
  try {
    const { saleId, productId } = req.params;
    const { name, code, costPrice, price, quantity } = req.body;

    // Find sale
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Find product inside the sale
    const product = sale.products.id(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found in this sale" });
    }

    // Update fields (only if provided)
    if (name !== undefined) product.name = name;
    if (code !== undefined) product.code = code;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;

    // Recalculate totals if needed
    product.totalPrice = product.price * product.quantity;
    sale.grandTotal = sale.products.reduce(
      (sum, p) => sum + (p.totalPrice || 0),
      0
    );

    await sale.save();

    res.json({
      message: "Product updated successfully",
      sale,
    });
  } catch (err) {
    console.error("Error updating product in sale:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

export default router;

import express from "express";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js"; // ✅ Import to access costPrice

const router = express.Router();

// Create a sale with costPrice injected into each product
router.post("/", async (req, res) => {
  try {
    const productsWithCost = await Promise.all(
      req.body.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found with ID: ${item.productId}`);
        }

        // Deduct the quantity sold from product stock
        if (product.quantity < item.quantity) {
          throw new Error(
            `Not enough stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
          );
        }
        product.quantity -= item.quantity;
        await product.save();

        return {
          ...item,
          costPrice: product.costPrice || 0,
        };
      })
    );

    const sale = new Sale({
      ...req.body,
      products: productsWithCost,
    });

    await sale.save();
    res.json(sale);
  } catch (err) {
    console.error("Error creating sale:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all sales
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a sale by ID
router.delete("/:id", async (req, res) => {
  try {
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a sale by ID
// Update a sale by ID with reason
router.put("/:id", async (req, res) => {
  try {
    const { reason, ...updateData } = req.body;

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // Save reason with timestamp
    if (reason) {
      sale.editReasons.push({ reason, editedAt: new Date() }); // ✅ include timestamp
    }

    // Update other fields
    Object.assign(sale, updateData);
    await sale.save();

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle sales return
router.post("/:id/return", async (req, res) => {
  try {
    const { returnedItems, refundAmount } = req.body;

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Add returned quantities back to product stock
    for (const item of returnedItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    sale.isReturned = true;
    sale.returnedItems = returnedItems;
    sale.totalRefundAmount = refundAmount;

    await sale.save();

    res.json({ message: "Sale return processed", sale });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error processing return", error: error.message });
  }
});

// 📊 Profit & Loss calculation route
router.get("/profit-loss", async (req, res) => {
  try {
    const sales = await Sale.find();

    let totalProfit = 0;
    let totalLoss = 0;

    sales.forEach((sale) => {
      sale.products.forEach((item) => {
        const profit = (item.price - item.costPrice) * item.quantity;
        if (profit >= 0) {
          totalProfit += profit;
        } else {
          totalLoss += Math.abs(profit);
        }
      });
    });

    res.json({
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
    });
  } catch (error) {
    console.error("Error calculating profit/loss:", error.message);
    res.status(500).json({ error: "Failed to calculate profit/loss" });
  }
});

export default router;

import express from "express";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      products,
      userBarcode,
      commissionPercent = 0,
      ...saleData
    } = req.body;

    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products are required" });
    }

    // Process products: verify stock and attach costPrice
    const productsWithCost = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found with ID: ${item.productId}`);
        }

        if (product.stock < (item.quantity || 0)) {
          throw new Error(
            `Not enough stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Deduct stock
        product.stock -= item.quantity || 0;
        await product.save();

        return {
          ...item,
          costPrice: product.costPrice || 0,
          // ensure discount field is present (per-unit discount)
          discount: Number(item.discount || 0),
        };
      })
    );

    // Create sale WITHOUT commission first (we'll compute commission after we have saved grandTotal)
    const sale = new Sale({
      ...saleData,
      products: productsWithCost,
      userBarcode: userBarcode || null,
    });

    await sale.save();

    // Compute and assign commission after saving (based on computed grandTotal)
    if (userBarcode) {
      const user = await User.findOne({ barcode: userBarcode });
      if (user) {
        const effectiveCommissionPercent =
          commissionPercent > 0 ? commissionPercent : user.commissionRate || 5;

        const commissionAmount =
          (sale.grandTotal * effectiveCommissionPercent) / 100;

        user.commissionEarned = (user.commissionEarned || 0) + commissionAmount;
        user.totalSales = (user.totalSales || 0) + 1;
        await user.save();

        // update sale with commission fields
        sale.assignedUser = user._id;
        sale.commissionPercent = effectiveCommissionPercent;
        sale.commissionAmount = commissionAmount;
        await sale.save();
      } else {
        console.log(`User not found with barcode: ${userBarcode}`);
      }
    }

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

// Update a sale by ID with reason
router.put("/:id", async (req, res) => {
  try {
    const { reason, ...updateData } = req.body;

    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // Save reason with timestamp
    if (reason) {
      sale.editReasons.push({ reason, editedAt: new Date() });
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
        product.stock += item.quantity;
        await product.save();
      }
    }

    // If commission was assigned, deduct it from user
    if (sale.assignedUser && sale.commissionAmount > 0) {
      const user = await User.findById(sale.assignedUser);
      if (user) {
        user.commissionEarned = Math.max(
          0,
          (user.commissionEarned || 0) - sale.commissionAmount
        );
        await user.save();
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

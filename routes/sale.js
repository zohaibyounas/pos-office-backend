import express from "express";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const session = await Product.startSession();
  session.startTransaction();

  try {
    const {
      products,
      userBarcode,
      commissionPercent = 0,
      ...saleData
    } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products are required" });
    }

    // console.log("🚀 Starting sale transaction...");

    // Process products sequentially to avoid version conflicts
    const productsWithCost = [];

    for (const item of products) {
      // console.log("\n=== PROCESSING PRODUCT ===");
      // console.log("🛒 Product ID:", item.productId);
      // console.log("📦 Selected Variant:", item.selectedVariant);
      // console.log("🔢 Quantity:", item.quantity);

      // Find product WITHIN transaction
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product not found with ID: ${item.productId}`);
      }

      // console.log("📋 Product:", product.name);
      // console.log("💰 Current Total Stock:", product.stock);
      // console.log(
      //   "📊 All Variants:",
      //   product.variants.map((v) => `${v.size}/${v.color}: ${v.stock}`)
      // );

      // Check stock based on variant selection
      if (
        item.selectedVariant &&
        item.selectedVariant.size &&
        item.selectedVariant.color
      ) {
        // console.log("🔍 Looking for variant:", item.selectedVariant);

        // Find the exact variant by both size AND color
        const variantIndex = product.variants.findIndex(
          (v) =>
            v.size === item.selectedVariant.size &&
            v.color === item.selectedVariant.color
        );

        if (variantIndex >= 0) {
          const variant = product.variants[variantIndex];
          // console.log(
          //   `✅ Found variant: ${variant.size}/${variant.color}, Stock: ${variant.stock}, Requested: ${item.quantity}`
          // );

          if (variant.stock < (item.quantity || 0)) {
            throw new Error(
              `Not enough stock for ${product.name} (${item.selectedVariant.color}, ${item.selectedVariant.size}). Available: ${variant.stock}, Requested: ${item.quantity}`
            );
          }

          // Deduct variant stock
          const oldVariantStock = variant.stock;
          product.variants[variantIndex].stock -= item.quantity || 0;

          // console.log(
          //   `📉 Deducted ${item.quantity} from variant ${item.selectedVariant.size}/${item.selectedVariant.color}`
          // );
          // console.log(
          //   `   ${oldVariantStock} → ${product.variants[variantIndex].stock}`
          // );

          // Mark variants as modified to trigger pre-save hook
          product.markModified("variants");
        } else {
          // console.log("❌ Variant not found");
          throw new Error(
            `Variant not found for ${product.name} (${
              item.selectedVariant.color
            }, ${
              item.selectedVariant.size
            }). Available variants: ${product.variants
              .map((v) => `${v.size}/${v.color}`)
              .join(", ")}`
          );
        }
      } else {
        // No variant selected, use global stock
        // console.log("ℹ️ No variant selected, using global stock");
        if (product.stock < (item.quantity || 0)) {
          throw new Error(
            `Not enough stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Deduct global stock
        const oldStock = product.stock;
        product.stock -= item.quantity || 0;
        // console.log(`📉 Deducted ${item.quantity} from global stock`);
        //  console.log(`   ${oldStock} → ${product.stock}`);
      }

      //  console.log("💾 Saving product...");
      await product.save({ session });
      ////  console.log(`✅ Product saved: ${product.name}`);
      //  console.log(`📊 Final stock: ${product.stock}`);
      // console.log("=== PRODUCT PROCESSING COMPLETE ===");

      productsWithCost.push({
        ...item,
        costPrice: product.costPrice || 0,
        discount: Number(item.discount || 0),
        selectedVariant: item.selectedVariant || null,
      });
    }

    // Create sale
    const sale = new Sale({
      ...saleData,
      products: productsWithCost,
      userBarcode: userBarcode || null,
    });

    await sale.save({ session });

    // Handle commission
    if (userBarcode) {
      const user = await User.findOne({ barcode: userBarcode }).session(
        session
      );
      if (user) {
        const effectiveCommissionPercent =
          commissionPercent > 0 ? commissionPercent : user.commissionRate || 5;

        const commissionAmount =
          (sale.grandTotal * effectiveCommissionPercent) / 100;

        user.commissionEarned = (user.commissionEarned || 0) + commissionAmount;
        user.totalSales = (user.totalSales || 0) + 1;
        await user.save({ session });

        sale.assignedUser = user._id;
        sale.commissionPercent = effectiveCommissionPercent;
        sale.commissionAmount = commissionAmount;
        await sale.save({ session });
        //  console.log(`💰 Commission assigned: ${commissionAmount}`);
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    // console.log("🎉 Sale transaction committed successfully!");

    res.json(sale);
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error("❌ Error creating sale:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
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

    if (reason) {
      sale.editReasons.push({ reason, editedAt: new Date() });
    }

    Object.assign(sale, updateData);
    await sale.save();

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle sales return
router.post("/:id/return", async (req, res) => {
  const session = await Product.startSession();
  session.startTransaction();

  try {
    const { returnedItems, refundAmount, returnDate } = req.body; // NEW: Added returnDate

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // console.log("🔄 Processing return for sale:", sale._id);
    // console.log("📦 Returned items:", returnedItems);

    // Add returned quantities back to product stock
    for (const item of returnedItems) {
      const product = await Product.findById(item.productId).session(session);
      if (product) {
        // console.log("\n=== PROCESSING RETURN ===");
        // console.log("🔍 Product:", product.name);
        // console.log("🎯 Selected Variant:", item.selectedVariant);
        // console.log(
        //   "📊 Current Variants:",
        //   product.variants.map((v) => `${v.size}/${v.color}: ${v.stock}`)
        // );

        if (item.selectedVariant && product.hasVariants && product.variants) {
          // Find the exact variant that was sold
          const variantIndex = product.variants.findIndex(
            (v) =>
              v.size === item.selectedVariant.size &&
              v.color === item.selectedVariant.color
          );

          if (variantIndex >= 0) {
            // Update the variant stock
            const oldVariantStock = product.variants[variantIndex].stock;
            product.variants[variantIndex].stock += item.quantity;
            product.markModified("variants");

            // console.log(
            //   `📈 Returned ${item.quantity} to variant ${item.selectedVariant.size}/${item.selectedVariant.color}`
            // );
            // console.log(
            //   `   ${oldVariantStock} → ${product.variants[variantIndex].stock}`
            // );
          } else {
            // console.log(
            //   `❌ Variant not found for product ${product.name}:`,
            //   item.selectedVariant
            // );
            // Fallback: add to global stock
            const oldStock = product.stock;
            product.stock += item.quantity;
            // console.log(`📈 Returned ${item.quantity} to global stock`);
            // console.log(`   ${oldStock} → ${product.stock}`);
          }
        } else {
          // No variant selected, use global stock
          const oldStock = product.stock;
          product.stock += item.quantity;
          // console.log(`📈 Returned ${item.quantity} to global stock`);
          // console.log(`   ${oldStock} → ${product.stock}`);
        }

        await product.save({ session });
        // console.log(`✅ Product saved: ${product.name}`);
        // console.log(`📊 Final stock: ${product.stock}`);
        // console.log("=== RETURN PROCESSING COMPLETE ===\n");
      }
    }

    // If commission was assigned, deduct it from user
    if (sale.assignedUser && sale.commissionAmount > 0) {
      const user = await User.findById(sale.assignedUser).session(session);
      if (user) {
        user.commissionEarned = Math.max(
          0,
          (user.commissionEarned || 0) - sale.commissionAmount
        );
        await user.save({ session });
        // console.log(`💰 Commission deducted: ${sale.commissionAmount}`);
      }
    }

    const now = new Date();
    const finalReturnDate = returnDate ? new Date(returnDate) : now; // NEW: Use provided return date

    // Add a timestamp to each returned item
    sale.returnedItems = returnedItems.map((item) => ({
      ...item,
      returnDate: finalReturnDate, // NEW: Use the actual return date
    }));

    sale.isReturned = true;
    sale.totalRefundAmount = refundAmount;
    sale.returnDate = finalReturnDate; // NEW: Store overall return date

    await sale.save({ session });

    // Commit transaction
    await session.commitTransaction();
    // console.log("✅ Return transaction committed successfully");

    res.json({ message: "Sale return processed successfully", sale });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error("❌ Error processing return:", error);
    res
      .status(500)
      .json({ message: "Error processing return", error: error.message });
  } finally {
    session.endSession();
  }
});

// Get profit & loss
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

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

    // console.log("🔄 Processing purchase return stock updates...");

    // 🔻 Decrease stock for returned products - FIXED FOR VARIANTS
    for (const item of req.body.products) {
      const product = await Product.findOne({ code: item.code });
      if (product) {
        // console.log(
        //   `📦 Processing product: ${product.name}, Code: ${product.code}`
        // );
        // console.log(
        //   `🔍 Variant info - Size: ${item.variantSize}, Color: ${item.variantColor}`
        // );

        if (product.hasVariants && item.variantSize && item.variantColor) {
          // Update specific variant stock - match by both size AND color
          const variantIndex = product.variants.findIndex(
            (v) => v.size === item.variantSize && v.color === item.variantColor
          );

          if (variantIndex !== -1) {
            const oldStock = product.variants[variantIndex].stock || 0;
            const qtyToRemove = item.quantity || 0;

            // Update variant stock (decrease for return)
            product.variants[variantIndex].stock = Math.max(
              0,
              oldStock - qtyToRemove
            );

            // console.log(
            //   `✅ Updated variant ${item.variantSize}/${item.variantColor} stock: ${oldStock} - ${qtyToRemove} = ${product.variants[variantIndex].stock}`
            // );

            // Save the product - this will trigger the pre-save hook to update total stock
            await product.save();

            // console.log(
            //   `📊 Final product stock after return: ${product.stock}`
            // );
          } else {
            // console.log(
            //   `❌ Variant not found for return: Size ${item.variantSize}, Color ${item.variantColor}`
            // );
          }
        } else {
          // Update main product stock (non-variant products)
          const oldStock = product.stock || 0;
          const qtyToRemove = item.quantity || 0;
          product.stock = Math.max(0, oldStock - qtyToRemove);
          await product.save();
          // console.log(
          //   `✅ Updated product ${product.code} stock: ${oldStock} - ${qtyToRemove} = ${product.stock}`
          // );
        }
      } else {
        // console.log(`❌ Product not found for return: ${item.code}`);
      }
    }

    res.status(201).json(newReturn);
  } catch (err) {
    console.error("Error saving return:", err);
    res.status(500).json({ error: "Failed to save return" });
  }
});

// DELETE a return - FIXED TO RESTORE STOCK
router.delete("/:id", async (req, res) => {
  try {
    const returnRecord = await PurchaseReturn.findById(req.params.id);
    if (!returnRecord) {
      return res.status(404).json({ message: "Return record not found" });
    }

    // console.log("🔄 Restoring stock from deleted return...");

    // 🔺 Restore stock when return is deleted
    for (const item of returnRecord.products) {
      const product = await Product.findOne({ code: item.code });
      if (product) {
        // console.log(
        //   `📦 Restoring stock for: ${product.name}, Code: ${product.code}`
        // );

        if (product.hasVariants && item.variantSize && item.variantColor) {
          // Restore specific variant stock
          const variantIndex = product.variants.findIndex(
            (v) => v.size === item.variantSize && v.color === item.variantColor
          );

          if (variantIndex !== -1) {
            const oldStock = product.variants[variantIndex].stock || 0;
            const qtyToRestore = item.quantity || 0;

            // Restore variant stock
            product.variants[variantIndex].stock = oldStock + qtyToRestore;

            // console.log(
            //   `✅ Restored variant ${item.variantSize}/${item.variantColor} stock: ${oldStock} + ${qtyToRestore} = ${product.variants[variantIndex].stock}`
            // );

            await product.save();
          } else {
            // console.log(
            //   `❌ Variant not found for restore: Size ${item.variantSize}, Color ${item.variantColor}`
            // );
          }
        } else {
          // Restore main product stock
          const oldStock = product.stock || 0;
          const qtyToRestore = item.quantity || 0;
          product.stock = oldStock + qtyToRestore;
          await product.save();
          // console.log(
          //   `✅ Restored product ${product.code} stock: ${oldStock} + ${qtyToRestore} = ${product.stock}`
          // );
        }
      }
    }

    // Now delete the return record
    await PurchaseReturn.findByIdAndDelete(req.params.id);
    res.json({ message: "Return deleted and stock restored" });
  } catch (err) {
    console.error("Error deleting return:", err);
    res.status(500).json({ error: "Failed to delete return" });
  }
});

// UPDATE a return - FIXED FOR STOCK ADJUSTMENTS
router.put("/:id", async (req, res) => {
  try {
    const originalReturn = await PurchaseReturn.findById(req.params.id);
    if (!originalReturn) {
      return res.status(404).json({ message: "Return record not found" });
    }

    // First restore original stock
    // console.log("🔄 Restoring original stock for update...");
    for (const item of originalReturn.products) {
      const product = await Product.findOne({ code: item.code });
      if (
        product &&
        product.hasVariants &&
        item.variantSize &&
        item.variantColor
      ) {
        const variantIndex = product.variants.findIndex(
          (v) => v.size === item.variantSize && v.color === item.variantColor
        );
        if (variantIndex !== -1) {
          product.variants[variantIndex].stock =
            (product.variants[variantIndex].stock || 0) + (item.quantity || 0);
          await product.save();
        }
      } else if (product) {
        product.stock = (product.stock || 0) + (item.quantity || 0);
        await product.save();
      }
    }

    // Then update with new data and apply new stock changes
    const updated = await PurchaseReturn.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Apply new stock changes
    // console.log("🔄 Applying new stock changes for update...");
    for (const item of req.body.products) {
      const product = await Product.findOne({ code: item.code });
      if (
        product &&
        product.hasVariants &&
        item.variantSize &&
        item.variantColor
      ) {
        const variantIndex = product.variants.findIndex(
          (v) => v.size === item.variantSize && v.color === item.variantColor
        );
        if (variantIndex !== -1) {
          product.variants[variantIndex].stock = Math.max(
            0,
            (product.variants[variantIndex].stock || 0) - (item.quantity || 0)
          );
          await product.save();
        }
      } else if (product) {
        product.stock = Math.max(
          0,
          (product.stock || 0) - (item.quantity || 0)
        );
        await product.save();
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating return:", err);
    res.status(500).json({ error: "Failed to update return" });
  }
});

export default router;

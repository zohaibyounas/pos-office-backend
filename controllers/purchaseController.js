// controllers/purchaseController.js
import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import cloudinary from "cloudinary";
import streamifier from "streamifier";

// Cloudinary config (load from .env)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Helper to upload image buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = "purchases") =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

// GET /api/purchases
export const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    console.error("getAllPurchases error:", err);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
};

// GET /api/purchases/:id
export const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });
    res.json(purchase);
  } catch (err) {
    console.error("getPurchase error:", err);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
};

// POST /api/purchases
// POST /api/purchases
// POST /api/purchases
// POST /api/purchases
// POST /api/purchases
export const createPurchase = async (req, res) => {
  try {
    const body = req.body || {};

    // Parse items if sent as JSON string
    if (body.items && typeof body.items === "string") {
      try {
        body.items = JSON.parse(body.items);
      } catch (e) {}
    }

    // Ensure grandTotal exists (frontend should send it)
    const grandTotal =
      typeof body.grandTotal === "number"
        ? body.grandTotal
        : Number(body.grandTotal || 0);

    // Handle payments if provided
    let payments = Array.isArray(body.payments) ? body.payments : [];
    if (!payments.length && body.initialPaid && Number(body.initialPaid) > 0) {
      payments = [
        {
          amount: Number(body.initialPaid),
          method: body.paymentMethod || "Cash",
          note: body.paymentNote || "Initial payment",
          date: body.initialPaidDate
            ? new Date(body.initialPaidDate)
            : new Date(),
        },
      ];
    }

    const purchaseData = {
      ...body,
      grandTotal,
      payments,
    };

    // ✅ Upload bill image if provided
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        "purchases"
      );
      purchaseData.billImage = uploadResult.secure_url;
    }

    const purchase = new Purchase(purchaseData);
    await purchase.save();

    // ✅ Update product stock for items - FIXED FOR YOUR VARIANT STRUCTURE
    for (const item of purchase.items || []) {
      const product = await Product.findOne({ code: item.code });
      if (product) {
        // console.log(
        //   `🔄 Processing product: ${product.name}, Code: ${product.code}`
        // );
        // console.log(
        //   `📦 Item has variant - Size: ${item.variantSize}, Color: ${item.variantColor}`
        // );

        if (product.hasVariants && item.variantSize && item.variantColor) {
          // Update specific variant stock - match by both size AND color
          const variantIndex = product.variants.findIndex(
            (v) => v.size === item.variantSize && v.color === item.variantColor
          );

          if (variantIndex !== -1) {
            const oldStock = product.variants[variantIndex].stock || 0;
            const qtyToAdd = item.qty || 0;

            // Update variant stock
            product.variants[variantIndex].stock = oldStock + qtyToAdd;

            // Also update variant cost price if provided in purchase
            if (item.costPrice) {
              product.variants[variantIndex].costPrice = item.costPrice;
            }

            // console.log(
            //   `✅ Updated variant ${item.variantSize}/${item.variantColor} stock: ${oldStock} + ${qtyToAdd} = ${product.variants[variantIndex].stock}`
            // );

            // Save the product - this will trigger the pre-save hook to update total stock
            await product.save();

            // console.log(`📊 Final product stock after save: ${product.stock}`);
          } else {
            // console.log(
            //   `❌ Variant not found: Size ${item.variantSize}, Color ${item.variantColor}`
            // );
            // If variant not found, create it
            const newVariant = {
              size: item.variantSize,
              color: item.variantColor,
              stock: item.qty || 0,
              costPrice: item.costPrice || product.costPrice,
            };
            product.variants.push(newVariant);
            await product.save();
            // console.log(
            //   `➕ Created new variant: ${item.variantSize}/${item.variantColor}`
            // );
          }
        } else {
          // Update main product stock (non-variant products)
          const oldStock = product.stock || 0;
          const qtyToAdd = item.qty || 0;
          product.stock = oldStock + qtyToAdd;
          await product.save();
          // console.log(
          //   `✅ Updated product ${product.code} stock: ${oldStock} + ${qtyToAdd} = ${product.stock}`
          // );
        }
      } else {
        // console.log(`❌ Product not found: ${item.code}`);
      }
    }

    res.status(201).json(purchase);
  } catch (err) {
    console.error("createPurchase error:", err);
    res.status(500).json({ error: "Failed to create purchase" });
  }
};
// PUT /api/purchases/:id
export const updatePurchase = async (req, res) => {
  try {
    const body = req.body || {};

    if (body.items && typeof body.items === "string") {
      try {
        body.items = JSON.parse(body.items);
      } catch (e) {}
    }

    // If new bill image uploaded
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        "purchases"
      );
      body.billImage = uploadResult.secure_url;
    }

    const updated = await Purchase.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated)
      return res.status(404).json({ message: "Purchase not found" });

    res.json(updated);
  } catch (err) {
    console.error("updatePurchase error:", err);
    res.status(500).json({ error: "Failed to update purchase" });
  }
};

// DELETE /api/purchases/:id
export const deletePurchase = async (req, res) => {
  try {
    const found = await Purchase.findByIdAndDelete(req.params.id);
    if (!found) return res.status(404).json({ message: "Purchase not found" });
    res.sendStatus(204);
  } catch (err) {
    console.error("deletePurchase error:", err);
    res.status(500).json({ error: "Failed to delete purchase" });
  }
};

/**
 * POST /api/purchases/:id/payments
 * Body: { amount, method, note, date(optional) }
 * Adds a payment entry to purchase.payments, updates paid and balance, returns updated purchase
 */
export const addPayment = async (req, res) => {
  try {
    const { amount, method = "Cash", note = "", date } = req.body;
    const numAmount = Number(amount || 0);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const paymentObj = {
      amount: numAmount,
      method,
      note,
      date: date ? new Date(date) : new Date(),
    };
    purchase.payments.push(paymentObj);

    // recalc paid & balance
    purchase.paid = purchase.payments.reduce((s, p) => s + (p.amount || 0), 0);
    purchase.balance = (purchase.grandTotal || 0) - purchase.paid;
    if (purchase.balance < 0) purchase.balance = 0;

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    console.error("addPayment error:", err);
    res.status(500).json({ error: "Failed to add payment" });
  }
};

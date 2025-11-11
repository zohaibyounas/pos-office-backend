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

    // ✅ Update product stock for items
    for (const item of purchase.items || []) {
      const product = await Product.findOne({ code: item.code });
      if (product) {
        product.stock = (product.stock || 0) + (item.qty || 0);
        await product.save();
      }
    }

    res.status(201).json(purchase);
  } catch (err) {
    console.error("createPurchase error:", err);
    res.status(500).json({ error: "Failed to create purchase" });
  }
};

// PUT /api/purchases/:id (full update)
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

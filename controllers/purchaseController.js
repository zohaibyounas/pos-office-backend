// controllers/purchaseController.js - UPDATED
import Purchase from "../models/Purchase.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// ✅ Get all purchases
export const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    console.error("Get all purchases error:", err);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
};

// ✅ Get single purchase
export const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.json(purchase);
  } catch (err) {
    console.error("Get purchase error:", err);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
};

// ✅ Create purchase - UPDATED
export const createPurchase = async (req, res) => {
  try {
    // console.log("=== CREATE PURCHASE REQUEST ===");
    // console.log("Request body:", req.body);

    const {
      purchaseName, // NEW FIELD
      supplier,
      totalPurchaseQty,
      totalCost,
      paymentType,
      initialPaid,
      paymentMethod,
      paymentNote,
      description,
    } = req.body;

    // Validate required fields
    if (!purchaseName || !supplier || !totalPurchaseQty || !totalCost) {
      // console.log("Validation failed - missing required fields");
      return res.status(400).json({
        error:
          "Purchase name, supplier, total quantity, and total cost are required",
      });
    }

    // console.log("Validated fields:", {
    //   purchaseName,
    //   supplier,
    //   totalPurchaseQty,
    //   totalCost,
    //   paymentType,
    // });

    // Handle bill image upload
    let billImageUrls = [];

    // If multiple files are uploaded
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file);
          billImageUrls.push(uploadResult.secure_url);
        } catch (uploadError) {
          console.error("Cloudinary upload error:", uploadError);
          billImageUrls.push("upload_failed");
        }
      }
    }

    const initialPayment = Number(initialPaid) || 0;
    const balance = Math.max(0, Number(totalCost) - initialPayment);

    // console.log("Calculated amounts:", {
    //   totalCost,
    //   initialPayment,
    //   balance,
    // });

    // Create purchase
    const newPurchase = new Purchase({
      purchaseName,
      supplier,
      totalPurchaseQty: Number(totalPurchaseQty),
      totalCost: Number(totalCost),
      billImages: billImageUrls, // <-- changed
      paymentType: paymentType || "Cash",
      paid: initialPayment,
      balance: balance,
      description: description || "",
    });
    // Add initial payment if provided
    if (initialPayment > 0) {
      newPurchase.payments.push({
        amount: initialPayment,
        method: paymentMethod || paymentType || "Cash",
        note: paymentNote || "Initial payment",
        date: new Date(),
      });
      // console.log("Added initial payment:", initialPayment);
    }

    // console.log("Attempting to save purchase to database...");
    await newPurchase.save();
    // console.log("Purchase saved successfully with ID:", newPurchase._id);

    res.status(201).json(newPurchase);
  } catch (err) {
    console.error("=== CREATE PURCHASE ERROR ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);

    res.status(500).json({
      error: "Failed to create purchase",
      details: err.message,
    });
  }
};

// ✅ Update purchase - UPDATED
export const updatePurchase = async (req, res) => {
  try {
    const {
      purchaseName, // NEW FIELD
      supplier,
      totalPurchaseQty,
      totalCost,
      paymentType,
      description,
    } = req.body;

    // Find existing purchase
    const existingPurchase = await Purchase.findById(req.params.id);
    if (!existingPurchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Handle bill image upload if new file provided
    let billImageUrl = existingPurchase.billImage;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file);
        billImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload bill image" });
      }
    }

    // Calculate new balance based on totalCost and existing payments
    const totalPaid = existingPurchase.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const newBalance = Math.max(0, Number(totalCost) - totalPaid);

    // Update purchase
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        purchaseName, // NEW FIELD
        supplier,
        totalPurchaseQty: Number(totalPurchaseQty),
        totalCost: Number(totalCost),
        billImage: billImageUrl,
        paymentType: paymentType || existingPurchase.paymentType,
        balance: newBalance,
        description: description || existingPurchase.description,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedPurchase);
  } catch (err) {
    console.error("Update purchase error:", err);
    res.status(500).json({ error: "Failed to update purchase" });
  }
};

// ✅ Delete purchase (unchanged)
export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.json({ message: "Purchase deleted successfully" });
  } catch (err) {
    console.error("Delete purchase error:", err);
    res.status(500).json({ error: "Failed to delete purchase" });
  }
};

// ✅ Add payment to purchase - UPDATED
export const addPayment = async (req, res) => {
  try {
    const { amount, method, note, date } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Valid payment amount is required" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Add new payment
    purchase.payments.push({
      amount: Number(amount),
      method: method || "Cash",
      note: note || "",
      date: date ? new Date(date) : new Date(),
    });

    // Recalculate paid amount and balance
    const totalPaid = purchase.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    purchase.paid = totalPaid;
    purchase.balance = Math.max(0, purchase.totalCost - totalPaid); // Use totalCost instead of totalBill

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    console.error("Add payment error:", err);
    res.status(500).json({ error: "Failed to add payment" });
  }
};

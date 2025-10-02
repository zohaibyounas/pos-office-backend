import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js"; // ✅ Import Product model

// GET /api/purchases
export const getAllPurchases = async (req, res) => {
  const purchases = await Purchase.find().sort({ createdAt: -1 });
  res.json(purchases);
};

// POST /api/purchases
export const createPurchase = async (req, res) => {
  try {
    const purchase = new Purchase(req.body);
    await purchase.save();

    // ✅ Update product stock for each purchased item
    for (const item of purchase.items) {
      const product = await Product.findOne({ code: item.code });
      if (product) {
        product.stock = (product.stock || 0) + item.qty; // increment stock
        await product.save();
      } else {
        console.warn(`Product with code ${item.code} not found!`);
      }
    }

    res.status(201).json(purchase);
  } catch (err) {
    console.error("Error creating purchase:", err);
    res.status(500).json({ error: "Failed to create purchase" });
  }
};

// PUT /api/purchases/:id
export const updatePurchase = async (req, res) => {
  try {
    const updated = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Purchase not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating purchase:", err);
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
    console.error("Error deleting purchase:", err);
    res.status(500).json({ error: "Failed to delete purchase" });
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
    console.error("Error fetching purchase:", err);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
};

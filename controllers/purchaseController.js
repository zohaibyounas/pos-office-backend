import Purchase from "../models/Purchase.js";

// GET /api/purchases
export const getAllPurchases = async (req, res) => {
  const purchases = await Purchase.find().sort({ createdAt: -1 });
  res.json(purchases);
};

// POST /api/purchases
export const createPurchase = async (req, res) => {
  const purchase = new Purchase(req.body);
  await purchase.save();
  res.status(201).json(purchase);
};

// PUT /api/purchases/:id
export const updatePurchase = async (req, res) => {
  const updated = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated) return res.status(404).json({ message: "Purchase not found" });
  res.json(updated);
};

// DELETE /api/purchases/:id
export const deletePurchase = async (req, res) => {
  const found = await Purchase.findByIdAndDelete(req.params.id);
  if (!found) return res.status(404).json({ message: "Purchase not found" });
  res.sendStatus(204);
};

// GET /api/purchases/:id
export const getPurchase = async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return res.status(404).json({ message: "Purchase not found" });
  res.json(purchase);
};

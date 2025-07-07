import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    brand: { type: String },
    price: { type: Number, required: true }, // Selling price
    costPrice: { type: Number, required: true },
    unit: { type: String },
    stock: { type: Number, default: 0 },
    image: { type: String },
    category: { type: String },
    vendor: { type: String },
    discount: { type: Number, default: 0 },
    Warehouse: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Product", productSchema);

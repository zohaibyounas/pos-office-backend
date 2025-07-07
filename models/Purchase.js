import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  code: String,
  name: String,
  price: Number,
  qty: Number,
  discount: Number,
  total: Number,
});

const purchaseSchema = new mongoose.Schema(
  {
    reference: String,
    supplier: String,
    warehouse: String,
    status: {
      type: String,
      enum: ["Pending", "Received", "Cancelled"],
      default: "Pending",
    },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    items: [itemSchema],
    grandTotal: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Purchase", purchaseSchema);

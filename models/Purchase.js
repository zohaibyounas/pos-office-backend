// models/Purchase.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  code: String,
  name: String,
  price: Number,
  costPrice: Number,
  qty: Number,
  discount: Number,
  total: Number,
  // Add variant fields
  variantSku: String, // to identify specific variant
  variantSize: String,
  variantColor: String,
});
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, default: 0 },
  method: { type: String, default: "Cash" }, // e.g., Cash, Bank, Card
  note: { type: String, default: "" },
  // store explicit date for timestamping
  date: { type: Date, default: Date.now },
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
    grandTotal: { type: Number, default: 0 },
    // New fields:
    billImage: { type: String, default: "" }, // store Cloudinary URL

    payments: { type: [paymentSchema], default: [] }, // history of payments with timestamps
    paid: { type: Number, default: 0 }, // sum(payments.amount)
    balance: { type: Number, default: 0 }, // grandTotal - paid
    paymentType: {
      type: String,
      enum: ["Cash", "Credit", "Card", "Bank"],
      default: "Cash",
    },
  },
  { timestamps: true }
);

// Optional: pre-save to ensure paid/balance consistent
purchaseSchema.pre("save", function (next) {
  if (this.payments && this.payments.length > 0) {
    this.paid = this.payments.reduce((s, p) => s + (p.amount || 0), 0);
  } else {
    this.paid = this.paid || 0;
  }
  this.balance = (this.grandTotal || 0) - (this.paid || 0);
  if (this.balance < 0) this.balance = 0;
  next();
});

export default mongoose.model("Purchase", purchaseSchema);

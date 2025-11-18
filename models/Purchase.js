// models/Purchase.js - UPDATED
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, default: 0 },
  method: { type: String, default: "Cash" },
  note: { type: String, default: "" },
  date: { type: Date, default: Date.now },
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },
    },
    purchaseName: {
      // NEW FIELD
      type: String,
      required: true,
      default: "General Purchase",
    },
    supplier: String,
    totalPurchaseQty: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    // totalBill field removed
    billImages: { type: [String], default: [] },
    payments: { type: [paymentSchema], default: [] },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentType: {
      type: String,
      enum: ["Cash", "Credit", "Card", "Bank"],
      default: "Cash",
    },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// Pre-save to ensure paid/balance consistent
purchaseSchema.pre("save", function (next) {
  if (this.payments && this.payments.length > 0) {
    this.paid = this.payments.reduce((s, p) => s + (p.amount || 0), 0);
  } else {
    this.paid = this.paid || 0;
  }
  // Use totalCost instead of totalBill
  this.balance = (this.totalCost || 0) - (this.paid || 0);
  if (this.balance < 0) this.balance = 0;
  next();
});

export default mongoose.model("Purchase", purchaseSchema);

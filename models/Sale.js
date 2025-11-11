// models/Sale.js
import mongoose from "mongoose";

const productSubSchema = new mongoose.Schema({
  productId: String,
  name: String,
  code: String,
  price: Number,
  quantity: Number,
  costPrice: Number,
  totalPrice: Number, // computed
  profit: Number,
  // per-unit discount (absolute). Example: discount: 100 => Rs100 off per unit
  discount: { type: Number, default: 0 },
  selectedVariant: {
    size: String,
    color: String,
  },
});

const saleSchema = new mongoose.Schema(
  {
    reference: String,
    customer: String,
    warehouse: String,
    status: { type: String, enum: ["Pending", "Completed", "Cancelled"] },
    paymentStatus: { type: String, enum: ["Unpaid", "Partial", "Paid"] },
    paymentType: String,
    grandTotal: Number,
    paid: Number,
    discount: Number, // sale-level discount (absolute)
    cashier: String,
    customerphone: String,
    date: { type: Date, default: Date.now },

    products: [productSubSchema],

    totalCost: Number,
    totalProfit: Number,
    profitMargin: Number,

    isReturned: { type: Boolean, default: false },
    returnedItems: [
      {
        productId: String,
        productName: String,
        quantity: Number,
        price: Number,
        costPrice: Number,
        refundAmount: Number,
        profitLoss: Number,
        reason: String,
        returnDate: { type: Date }, // <-- per-item date
      },
    ],
    totalRefundAmount: { type: Number, default: 0 },
    returnDate: { type: Date }, // <-- NEW: overall return date
    netProfit: Number,

    editReasons: [
      {
        reason: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
    commissionPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Middleware to calculate totals before saving
saleSchema.pre("save", function (next) {
  // Ensure numbers exist
  this.discount = Number(this.discount || 0);

  // First compute per-product baselines
  this.products = this.products.map((product) => {
    product.price = Number(product.price || 0);
    product.quantity = Number(product.quantity || 1);
    product.costPrice = Number(product.costPrice || 0);
    product.discount = Number(product.discount || 0); // per-unit discount

    // product total BEFORE any sale-level distribution
    const productTotalBefore = product.price * product.quantity;

    // profit BEFORE discount (price - costPrice) * qty
    product.profit = (product.price - product.costPrice) * product.quantity;

    product.totalPrice = productTotalBefore; // will adjust below

    return product;
  });

  // Do we have any per-product discounts?
  const hasPerProductDiscount = this.products.some(
    (p) => p.discount && p.discount > 0
  );

  // If per-product discounts exist -> apply them and ignore sale-level discount
  if (hasPerProductDiscount) {
    this.products = this.products.map((product) => {
      const qty = product.quantity || 1;
      const productDiscountTotal = (product.discount || 0) * qty; // per-unit * qty
      product.totalPrice = product.price * qty - productDiscountTotal;
      if (product.totalPrice < 0) product.totalPrice = 0;
      return product;
    });
  } else {
    // No per-product discounts: if sale-level discount exists, distribute proportionally
    const totalBeforeDiscount = this.products.reduce(
      (sum, prod) => sum + prod.price * prod.quantity,
      0
    );

    if (this.discount && this.discount > 0 && totalBeforeDiscount > 0) {
      // Distribute sale-level discount proportionally
      this.products = this.products.map((product) => {
        const productTotal = product.price * product.quantity;
        const share = (productTotal / totalBeforeDiscount) * this.discount;
        product.totalPrice = productTotal - share;
        if (product.totalPrice < 0) product.totalPrice = 0;
        return product;
      });
    } else {
      // No discounts at all: leave product.totalPrice as price * qty
      this.products = this.products.map((product) => {
        product.totalPrice = product.price * product.quantity;
        return product;
      });
    }
  }

  // Compute totalCost (sum of costPrice * qty)
  this.totalCost = this.products.reduce(
    (sum, p) => sum + (p.costPrice || 0) * (p.quantity || 1),
    0
  );

  // grandTotal = sum of product.totalPrice (after product discounts or sale-level distribution)
  this.grandTotal = this.products.reduce(
    (sum, p) => sum + (p.totalPrice || 0),
    0
  );

  // Compute totalProfit: sum of product profits (price - costPrice)*qty minus applied discounts
  // If per-product discounts used, we already adjusted product.totalPrice. We need to calculate actual totalProfit:
  // totalProfit = grandTotal - totalCost
  this.totalProfit = this.grandTotal - this.totalCost;

  // profitMargin
  this.profitMargin =
    this.grandTotal > 0 ? (this.totalProfit / this.grandTotal) * 100 : 0;

  // netProfit considering returns
  if (this.isReturned) {
    this.netProfit = this.totalProfit - (this.totalRefundAmount || 0);
  } else {
    this.netProfit = this.totalProfit;
  }

  next();
});

export default mongoose.model("Sale", saleSchema);

import mongoose from "mongoose";

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
    discount: Number,
    cashier: String,
    customerphone: String,
    date: { type: Date, default: Date.now },

    products: [
      {
        productId: String,
        name: String,
        code: String,
        price: Number,
        quantity: Number,
        costPrice: Number,
        totalPrice: Number, // price * quantity
        profit: Number, // (price - costPrice) * quantity
      },
    ],

    // Profit tracking fields
    totalCost: Number, // Sum of (costPrice * quantity) for all products
    totalProfit: Number, // grandTotal - totalCost - discount
    profitMargin: Number, // (totalProfit / grandTotal) * 100

    isReturned: { type: Boolean, default: false },
    returnedItems: [
      {
        productId: String,
        productName: String,
        quantity: Number,
        price: Number,
        costPrice: Number,
        refundAmount: Number,
        profitLoss: Number, // Profit loss from return
        reason: String,
      },
    ],
    totalRefundAmount: { type: Number, default: 0 },
    netProfit: Number,

    // 🔥 New field for tracking edit reasons
    editReasons: [
      {
        reason: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Middleware to calculate profit before saving
saleSchema.pre("save", function (next) {
  // Calculate product totals and profit
  this.products = this.products.map((product) => {
    product.totalPrice = product.price * product.quantity;
    product.profit = (product.price - product.costPrice) * product.quantity;
    return product;
  });

  // Apply discount proportionally if exists
  if (this.discount && this.discount > 0) {
    const totalBeforeDiscount = this.products.reduce(
      (sum, product) => sum + product.totalPrice,
      0
    );

    if (totalBeforeDiscount > 0) {
      this.products = this.products.map((product) => {
        const share =
          (product.totalPrice / totalBeforeDiscount) * this.discount;
        product.totalPrice = product.totalPrice - share; // ✅ discounted product price
        return product;
      });
    }
  }

  // Calculate sale-wide metrics
  this.totalCost = this.products.reduce(
    (sum, product) => sum + product.costPrice * product.quantity,
    0
  );

  this.grandTotal = this.products.reduce(
    (sum, product) => sum + product.totalPrice,
    0
  );

  // Profit after discount
  this.totalProfit =
    this.products.reduce((sum, product) => sum + product.profit, 0) -
    (this.discount || 0);

  this.profitMargin =
    this.grandTotal > 0 ? (this.totalProfit / this.grandTotal) * 100 : 0;

  // Handle returns
  if (this.isReturned) {
    this.netProfit = this.totalProfit - this.totalRefundAmount;
  } else {
    this.netProfit = this.totalProfit;
  }

  next();
});

export default mongoose.model("Sale", saleSchema);

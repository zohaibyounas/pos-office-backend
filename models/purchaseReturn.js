import mongoose from "mongoose";

const purchaseReturnSchema = new mongoose.Schema(
  {
    supplier: String,
    warehouse: String,
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        code: String,
        quantity: Number,
        price: Number,
        costPrice: Number,
        // Add variant fields
        variantSize: String,
        variantColor: String,
      },
    ],
    total: Number,
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Export using ES Module default export
const PurchaseReturn = mongoose.model("PurchaseReturn", purchaseReturnSchema);
export default PurchaseReturn;

import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    size: { type: String },
    color: { type: String },
    stock: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    brand: { type: String },
    price: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    unit: { type: String },
    image: { type: String },
    category: { type: String },
    vendor: { type: String },
    discount: { type: Number, default: 0 },
    Warehouse: { type: String },

    // Variant system
    variants: [variantSchema],

    // Global stock (sum of all variants)
    stock: { type: Number, default: 0 },

    // Track if product has variants
    hasVariants: { type: Boolean, default: false },

    // Version key for optimistic locking
    __v: { type: Number, select: false },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enable optimistic locking
  }
);

// Calculate total stock before saving - FIXED VERSION
productSchema.pre("save", function (next) {
  // console.log("🔄 Product pre-save hook triggered for:", this.name);

  if (this.variants && this.variants.length > 0) {
    const newStock = this.variants.reduce((sum, variant) => {
      const variantStock = Number(variant.stock) || 0;
      return sum + variantStock;
    }, 0);

    // console.log(`📊 Total stock calculated from variants: ${newStock}`);
    // console.log(
    //   "📦 Variant details:",
    //   this.variants.map((v) => `${v.size}/${v.color}: ${v.stock}`)
    // );

    // Always update the stock to ensure consistency
    this.stock = newStock;
    // console.log(`✅ Set total stock to: ${newStock}`);

    this.hasVariants = true;
  } else {
    // console.log(`ℹ️ No variants, using direct stock: ${this.stock}`);
    this.hasVariants = false;
  }

  // console.log(`🎯 Final stock for ${this.name}: ${this.stock}`);
  next();
});

// Add post-save hook to verify the stock was updated
productSchema.post("save", function (doc) {
  // console.log(
  //   `💾 Product saved: ${doc.name}, Stock: ${doc.stock}, Version: ${doc.__v}`
  // );
});

export default mongoose.model("Product", productSchema);

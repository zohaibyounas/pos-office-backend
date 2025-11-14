// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
    role: String,
    phone: String,
    cnic: String,
    monthlySalary: { type: Number, default: 0 },
    barcode: { type: String, unique: true },
    commissionPercent: { type: Number, default: 0 }, // This must be here
    commissionEarned: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Add this to see when users are created/updated
  }
);

userSchema.virtual("totalSalary").get(function () {
  return this.monthlySalary + this.commissionEarned;
});

const User = mongoose.model("User", userSchema);
export default User;

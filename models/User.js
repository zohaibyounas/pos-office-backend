// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String, // 'admin', 'user', 'cashier'
  phone: String,
  cnic: String,
  monthlySalary: { type: Number, default: 0 },
  barcode: { type: String, unique: true }, // for scanning user card
  commissionEarned: { type: Number, default: 0 }, // running commission
});

userSchema.virtual("totalSalary").get(function () {
  return this.monthlySalary + this.commissionEarned;
});

const User = mongoose.model("User", userSchema);
export default User;

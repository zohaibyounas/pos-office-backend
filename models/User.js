import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String, // 'admin', 'user', 'cashier'
  phone: String,
  cnic: String,
  monthlySalary: Number,
  commissionEnabled: { type: Boolean, default: true },
  commissionRate: { type: Number, default: 2.5 },
});

const User = mongoose.model("User", userSchema);
export default User;

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String, // 'admin' or 'user'
});

const User = mongoose.model("User", userSchema);
export default User;

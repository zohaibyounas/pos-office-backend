import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import saleRoutes from "./routes/sale.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import purchaseReturnRoutes from "./routes/purchaseReturn.js";
import salesReportRoute from "./routes/salesReport.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import cloudinary from "cloudinary";
import attendanceRoutes from "./routes/attendance.js";
import commentRoutes from "./routes/commentRoutes.js";

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// ✅ CORS setup
app.use(
  cors({
    origin: [
      "https://pos-office-frontend.vercel.app",
      "https://www.cielonoir-backend.shop",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://www.cielinoir.shop",
    ],
    // allow frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // allowed methods
    credentials: true, // allow cookies/auth headers if needed
  })
);

app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchase-returns", purchaseReturnRoutes);
app.use(salesReportRoute);
app.use("/api/expenses", expenseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/comments", commentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes); // ✅ Login endpoint: POST /api/auth/login
app.use("/api/users", userRoutes); // ✅ User CRUD: GET/POST /api/users

app.use("/api/sales", saleRoutes); // ✅ This must match exactly!

app.use("/api/purchases", purchaseRoutes);

app.use("/api/purchase-returns", purchaseReturnRoutes);

app.use(salesReportRoute);

app.use("/api/expenses", expenseRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

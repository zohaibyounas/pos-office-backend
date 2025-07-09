// routes/expenseRoutes.js
import express from "express";
import {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseReport,
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/", addExpense);
router.get("/", getExpenses);
router.get("/report/filter", getExpenseReport); // ✅ This line must exist!
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;

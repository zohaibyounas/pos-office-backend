import Expense from "../models/expense.js";

// Add a new expense
export const addExpense = async (req, res) => {
  try {
    const { amount, name, details } = req.body;
    const expense = new Expense({ amount, name, details });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: "Failed to add expense", error: err });
  }
};

// Get all expenses with total
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch expenses", error: err });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, name, details } = req.body;
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      { amount, name, details },
      { new: true }
    );
    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json(updatedExpense);
  } catch (err) {
    res.status(500).json({ message: "Failed to update expense", error: err });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExpense = await Expense.findByIdAndDelete(id);
    if (!deletedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete expense", error: err });
  }
};

// Get expense report (optional: filter by date range, name, etc.)
export const getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);

      filter.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ expenses, total });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err });
  }
};

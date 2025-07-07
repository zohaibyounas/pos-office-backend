import express from "express";
import {
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
  getProductById,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts); // get all
router.post("/", addProduct); // add
router.get("/:id", getProductById); // get single
router.put("/:id", updateProduct); // update
router.delete("/:id", deleteProduct); // delete

export default router;

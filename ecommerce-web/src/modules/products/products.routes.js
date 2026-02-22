import express from "express";
import {
  getProductsControl,
  getProductByIdControl,
  searchProductsControl,
  getProductsByCategoryControl,
  createProductControl,
  updateProductControl,
  deleteProductControl,
  hardDeleteProductControl,
  updateProductStockControl
} from "./products.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";
import { productReviewsRoutes } from "../reviews/reviews.routes.js";

const router = express.Router();

// ===============================
// PUBLIC ROUTES
// ===============================

router.get("/", getProductsControl);                           // GET /api/products
router.get("/search", searchProductsControl);                  // GET /api/products/search?q=query
router.get("/category/:categoryId", getProductsByCategoryControl); // GET /api/products/category/:categoryId

// Product Reviews Routes (nested)
router.use("/:productId/reviews", productReviewsRoutes);       // GET/POST /api/products/:productId/reviews

router.get("/:id", getProductByIdControl);                     // GET /api/products/:id

// ===============================
// ADMIN ROUTES
// ===============================

router.post("/", authenticate, adminOnly, createProductControl);                    // POST /api/products
router.put("/:id", authenticate, adminOnly, updateProductControl);                  // PUT /api/products/:id
router.delete("/:id", authenticate, adminOnly, deleteProductControl);               // DELETE /api/products/:id (soft)
router.delete("/:id/hard", authenticate, adminOnly, hardDeleteProductControl);      // DELETE /api/products/:id/hard (permanent)
router.patch("/:id/stock", authenticate, adminOnly, updateProductStockControl);     // PATCH /api/products/:id/stock

export default router;
import express from "express";
import {
  getCartControl,
  addToCartControl,
  updateCartItemControl,
  removeFromCartControl,
  clearCartControl,
  getCartSummaryControl,
  validateCartControl,
  checkProductInCartControl,
  getCartItemCountControl,
  updateCartItemsControl
} from "./cart.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router({ mergeParams: true });

// All cart routes require authentication
router.use(authenticate);

// ===============================
// CART ROUTES
// All routes are nested under /api/cart/:userId
// ===============================

// Utility routes (should come before parameterized routes)
router.get("/:userId/summary", getCartSummaryControl);              // GET /api/cart/:userId/summary
router.get("/:userId/validate", validateCartControl);               // GET /api/cart/:userId/validate
router.get("/:userId/count", getCartItemCountControl);              // GET /api/cart/:userId/count
router.get("/:userId/check/:productId", checkProductInCartControl); // GET /api/cart/:userId/check/:productId

// Main cart operations
router.get("/:userId", getCartControl);                             // GET /api/cart/:userId
router.delete("/:userId", clearCartControl);                        // DELETE /api/cart/:userId (clear cart)

// Cart items operations
router.post("/:userId/items", addToCartControl);                    // POST /api/cart/:userId/items
router.put("/:userId/items", updateCartItemsControl);               // PUT /api/cart/:userId/items (bulk update)
router.put("/:userId/items/:cartItemId", updateCartItemControl);    // PUT /api/cart/:userId/items/:cartItemId
router.delete("/:userId/items/:cartItemId", removeFromCartControl); // DELETE /api/cart/:userId/items/:cartItemId

export default router;
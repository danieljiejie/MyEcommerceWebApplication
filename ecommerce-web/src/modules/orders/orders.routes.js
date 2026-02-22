import express from "express";
import {
  createOrderControl,
  getOrderByIdControl,
  getUserOrdersControl,
  getMyOrdersControl,
  updateOrderStatusControl,
  cancelOrderControl,
  getUserOrderStatsControl,
  getMyOrderStatsControl,
  getAllOrdersControl,
  getOrderTimelineControl,
  canReviewOrderControl,
  getRecentOrdersControl,
  getOrderWithProductsControl
} from "./orders.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// ===============================
// AUTHENTICATED USER ROUTES
// ===============================

// Create order from cart (checkout)
router.post("/", createOrderControl);                              // POST /api/orders

// Current user's orders
router.get("/me", getMyOrdersControl);                             // GET /api/orders/me
router.get("/me/stats", getMyOrderStatsControl);                   // GET /api/orders/me/stats
router.get("/me/recent", getRecentOrdersControl);                  // GET /api/orders/me/recent

// Single order operations
router.get("/:orderId", getOrderByIdControl);                      // GET /api/orders/:orderId
router.get("/:orderId/timeline", getOrderTimelineControl);         // GET /api/orders/:orderId/timeline
router.get("/:orderId/can-review", canReviewOrderControl);         // GET /api/orders/:orderId/can-review
router.put("/:orderId/cancel", cancelOrderControl);                // PUT /api/orders/:orderId/cancel

// Update order status (restricted - see controller for permissions)
router.put("/:orderId/status", updateOrderStatusControl);          // PUT /api/orders/:orderId/status

// ===============================
// SPECIFIC USER'S ORDERS (admin or own)
// ===============================

router.get("/product/:orderId", authenticate, getOrderWithProductsControl); //GET /api/orders/product/:orderId

router.get("/user/:userId", getUserOrdersControl);                 // GET /api/orders/user/:userId
router.get("/user/:userId/stats", getUserOrderStatsControl);       // GET /api/orders/user/:userId/stats

// ===============================
// ADMIN ROUTES
// ===============================

router.get("/admin/all", authenticate, adminOnly, getAllOrdersControl);  // GET /api/orders/admin/all

export default router;
import express from "express";
import {
  getProductReviewsControl,
  getReviewByIdControl,
  getUserReviewsControl,
  getMyReviewsControl,
  createReviewControl,
  updateReviewControl,
  deleteReviewControl,
  getProductRatingStatsControl,
  checkUserReviewedControl,
  getFeaturedReviewsControl,
  getAllReviewsControl
} from "./reviews.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// ===============================
// PUBLIC ROUTES
// ===============================

// Get featured reviews (homepage)
router.get("/featured", getFeaturedReviewsControl);

// Get single review by ID
router.get("/:id", getReviewByIdControl);

// ===============================
// AUTHENTICATED USER ROUTES
// ===============================

// Get current user's reviews
router.get("/me/reviews", authenticate, getMyReviewsControl);

// ===============================
// ADMIN ROUTES
// ===============================

// Get all reviews (admin)
router.get("/admin/all", authenticate, adminOnly, getAllReviewsControl);

// ===============================
// PRODUCT-RELATED ROUTES (nested under products)
// These should be mounted in products.routes.js or used with product router
// ===============================

// Note: These routes are meant to be used as:
// app.use("/api/products/:productId/reviews", reviewsRouter);
// But for simplicity, we'll include them here with productId param

export default router;

// ===============================
// EXPORT INDIVIDUAL ROUTE HANDLERS
// for use in products.routes.js
// ===============================

export const productReviewsRoutes = express.Router({ mergeParams: true });

// Public routes for product reviews
productReviewsRoutes.get("/", getProductReviewsControl);                    // GET /api/products/:productId/reviews
productReviewsRoutes.get("/stats", getProductRatingStatsControl);            // GET /api/products/:productId/reviews/stats

// Authenticated routes
productReviewsRoutes.post("/", authenticate, createReviewControl);           // POST /api/products/:productId/reviews
productReviewsRoutes.get("/check", authenticate, checkUserReviewedControl);  // GET /api/products/:productId/reviews/check

// User-specific routes (update/delete own reviews)
productReviewsRoutes.put("/:id", authenticate, updateReviewControl);         // PUT /api/products/:productId/reviews/:id
productReviewsRoutes.delete("/:id", authenticate, deleteReviewControl);      // DELETE /api/products/:productId/reviews/:id

// ===============================
// EXPORT STANDALONE USER REVIEWS ROUTES
// ===============================

export const userReviewsRoutes = express.Router({ mergeParams: true });

// Get specific user's reviews (public)
userReviewsRoutes.get("/", getUserReviewsControl);  // GET /api/users/:userId/reviews
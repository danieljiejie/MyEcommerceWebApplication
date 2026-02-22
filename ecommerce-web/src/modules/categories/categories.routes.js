import express from "express";
import {
  getCategoriesControl,
  getCategoryByIdControl,
  getCategoryBySlugControl,
  createCategoryControl,
  updateCategoryControl,
  deleteCategoryControl
} from "./categories.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getCategoriesControl);                    // GET /api/categories
router.get("/slug/:slug", getCategoryBySlugControl);      // GET /api/categories/slug/:slug
router.get("/:id", getCategoryByIdControl);               // GET /api/categories/:id

// Admin-only routes
router.post("/", authenticate, adminOnly, createCategoryControl);        // POST /api/categories
router.put("/:id", authenticate, adminOnly, updateCategoryControl);      // PUT /api/categories/:id
router.delete("/:id", authenticate, adminOnly, deleteCategoryControl);   // DELETE /api/categories/:id

export default router;
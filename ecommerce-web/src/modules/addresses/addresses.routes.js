import express from "express";
import {
  getUserAddressesControl,
  getAddressByIdControl,
  getDefaultAddressControl,
  createAddressControl,
  updateAddressControl,
  deleteAddressControl,
  setDefaultAddressControl,
  getFormattedAddressControl,
  checkUserHasAddressesControl,
  validateAddressControl
} from "./addresses.controller.js";
import { authenticate, adminOnly } from "../../middlewares/auth.middleware.js";

const router = express.Router({ mergeParams: true });

// All address routes require authentication
router.use(authenticate);

// ===============================
// ADDRESS ROUTES
// All routes are nested under /api/users/:userId/addresses
// ===============================

// Utility routes (should come before :addressId routes)
router.get("/default", getDefaultAddressControl);              // GET /api/users/:userId/addresses/default
router.get("/check", checkUserHasAddressesControl);            // GET /api/users/:userId/addresses/check
router.post("/validate", validateAddressControl);              // POST /api/users/:userId/addresses/validate

// CRUD routes
router.get("/", getUserAddressesControl);                      // GET /api/users/:userId/addresses
router.post("/", createAddressControl);                        // POST /api/users/:userId/addresses

// Single address routes (must come after utility routes)
router.get("/:addressId", getAddressByIdControl);              // GET /api/users/:userId/addresses/:addressId
router.put("/:addressId", updateAddressControl);               // PUT /api/users/:userId/addresses/:addressId
router.delete("/:addressId", deleteAddressControl);            // DELETE /api/users/:userId/addresses/:addressId

// Special operations
router.put("/:addressId/set-default", setDefaultAddressControl);  // PUT /api/users/:userId/addresses/:addressId/set-default
router.get("/:addressId/format", getFormattedAddressControl);     // GET /api/users/:userId/addresses/:addressId/format

export default router;
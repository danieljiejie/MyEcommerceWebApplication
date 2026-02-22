// src/modules/payments/payment.routes.js
// Register in app.js: app.use("/api/payments", paymentRouter);

import express from "express";
import { createIntentControl, verifyIntentControl } from "./payment.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js"

const router = express.Router();

// Both routes require a valid JWT — only logged-in users can initiate payments
router.post("/create-intent", authenticate, createIntentControl);
router.get("/verify/:paymentIntentId", authenticate, verifyIntentControl);

export default router;
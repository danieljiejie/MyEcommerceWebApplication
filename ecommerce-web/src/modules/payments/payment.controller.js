// src/modules/payments/payment.controller.js

import { createPaymentIntent, retrievePaymentIntent } from "./payment.service.js";

// ─── Create Payment Intent ────────────────────────────────────────────────────
// POST /api/payments/create-intent
// Protected — requires Bearer token (authenticate middleware)
//
// Body: { amount_cents: 2999, currency: "usd" }
// Returns: { clientSecret: "pi_xxx_secret_xxx", paymentIntentId: "pi_xxx" }
//
export const createIntentControl = async (req, res) => {
  try {
    const { amount_cents, currency } = req.body;

    if (!amount_cents || isNaN(amount_cents) || amount_cents <= 0) {
      return res.status(400).json({ message: "A valid amount is required." });
    }

    const result = await createPaymentIntent({
      amount:   amount_cents,
      currency: currency || "usd",
      metadata: {
        user_id: req.user.id,   // from JWT via authenticate middleware
        user_email: req.user.email,
      },
    });

    res.json(result);
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({ message: error.message || "Failed to create payment intent." });
  }
};

// ─── Verify Payment Intent (optional) ────────────────────────────────────────
// GET /api/payments/verify/:paymentIntentId
// Call this server-side after the frontend confirms payment to double-check
// the status directly with Stripe before marking the order as paid.
//
export const verifyIntentControl = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    res.json({
      status:          paymentIntent.status,         // "succeeded", "requires_payment_method", etc.
      paymentIntentId: paymentIntent.id,
      amount:          paymentIntent.amount,
    });
  } catch (error) {
    console.error("Verify payment intent error:", error);
    res.status(500).json({ message: error.message });
  }
};
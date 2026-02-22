// src/modules/payments/payment.service.js
// npm install stripe
// Add to .env: STRIPE_SECRET_KEY=sk_test_...

import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// ─── Create Payment Intent ────────────────────────────────────────────────────
// Called before the user submits their card details.
// Returns a client_secret that the frontend uses to confirm the payment.
//
// amount: total in CENTS (e.g. $29.99 → 2999)
// currency: ISO currency code (default "usd")
// metadata: attached to the PaymentIntent in your Stripe dashboard for debugging
//
export const createPaymentIntent = async ({ amount, currency = "usd", metadata = {} }) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(amount), // Stripe requires integer cents
    currency,
    // automatic_payment_methods lets Stripe show the best payment UI
    // for your region (card, Apple Pay, Google Pay, etc.)
    automatic_payment_methods: { enabled: true },
    metadata, // e.g. { user_id: "abc", order_ref: "temp" }
  });

  return {
    clientSecret:     paymentIntent.client_secret,
    paymentIntentId:  paymentIntent.id,
  };
};

// ─── Retrieve Payment Intent (optional — for verification) ───────────────────
// Use this server-side to verify a payment succeeded before fulfilling the order.
// The frontend sends the paymentIntentId after confirmation, and you can
// double-check its status here rather than trusting the client.
//
export const retrievePaymentIntent = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent;
};
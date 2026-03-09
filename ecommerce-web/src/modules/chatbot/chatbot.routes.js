/**
 * route.js  (ES Module — v3)
 *
 * Register in app.js:
 *   import chatbotRoutes from "./modules/chatbot/route.js";
 *   app.use("/api/chatbot", chatbotRoutes);
 */

import express from "express";
import jwt from "jsonwebtoken";
import { sendMessage, streamMessage, healthCheck } from "./chatbot.controller.js";

const router = express.Router();

// ─── Optional Auth ────────────────────────────────────────────────────────────
// Attaches req.user if a valid Bearer token is present — but does NOT block guests.
// This lets logged-in users get personalised DB context, while guests still work.
const optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch {
    req.user = null; // invalid / expired token → treat as guest
  }
  next();
};

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Replace with express-rate-limit + Redis in production
const ipCounters = new Map();
const RATE_LIMIT  = 30;   // max messages
const RATE_WINDOW = 60_000; // per minute

const rateLimiter = (req, res, next) => {
  const ip  = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const rec = ipCounters.get(ip);

  if (!rec || now - rec.start > RATE_WINDOW) {
    ipCounters.set(ip, { count: 1, start: now });
    return next();
  }
  rec.count += 1;
  if (rec.count > RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "Too many messages. Please wait a moment before continuing.",
    });
  }
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get("/health",  healthCheck);
router.post("/message", optionalAuth, rateLimiter, sendMessage);
router.post("/stream",  optionalAuth, rateLimiter, streamMessage);

export default router;
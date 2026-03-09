/**
 * controller.js  (ES Module — v3)
 *
 * Imports pool from your existing db.js using ES module syntax.
 * Adjust the import path if your db.js is in a different location.
 */

import pool from "../../config/db.js";       // ← your existing db.js (adjust path if needed)
import { chat, chatStream, healthCheck as ollamaHealth } from "./chatbot.services.js";

// ─── POST /api/chatbot/message ────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "messages array is required" });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({ success: false, message: "Each message needs role and content" });
      }
      if (!["user", "assistant"].includes(msg.role)) {
        return res.status(400).json({ success: false, message: "role must be 'user' or 'assistant'" });
      }
    }

    // Build user context — null means guest (still gets product search)
    const userContext = req.user
      ? {
          userId:  req.user.id,
          name:    `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() || req.user.email,
          email:   req.user.email,
          isAdmin: req.user.is_admin || false,
        }
      : null;

    const reply = await chat(messages.slice(-20), userContext, pool);

    return res.status(200).json({
      success: true,
      reply,
      model: process.env.OLLAMA_MODEL || "llama3.2",
    });
  } catch (err) {
    console.error("[Chatbot] sendMessage error:", err.message);

    if (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed")) {
      return res.status(503).json({
        success: false,
        message: "AI service is currently unavailable. Please try again later.",
        error: "OLLAMA_UNAVAILABLE",
      });
    }

    return res.status(500).json({ success: false, message: "Failed to process your message." });
  }
};

// ─── POST /api/chatbot/stream ─────────────────────────────────────────────────
export const streamMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "messages array is required" });
    }

    const userContext = req.user
      ? {
          userId:  req.user.id,
          name:    `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim(),
          email:   req.user.email,
          isAdmin: req.user.is_admin || false,
        }
      : null;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let fullReply = "";

    await chatStream(messages.slice(-20), userContext, pool, (token) => {
      fullReply += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true, fullReply })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[Chatbot] streamMessage error:", err.message);
    if (!res.headersSent) {
      return res.status(503).json({ success: false, message: "Streaming unavailable." });
    }
    res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
    res.end();
  }
};

// ─── GET /api/chatbot/health ──────────────────────────────────────────────────
export const healthCheck = async (req, res) => {
  try {
    const ollamaStatus = await ollamaHealth();

    // Also verify DB is alive
    let dbStatus = { ok: false };
    try {
      await pool.query("SELECT 1");
      dbStatus = { ok: true };
    } catch (err) {
      dbStatus = { ok: false, error: err.message };
    }

    return res.status(ollamaStatus.ok ? 200 : 503).json({
      success: ollamaStatus.ok,
      ollama:   ollamaStatus,
      database: dbStatus,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
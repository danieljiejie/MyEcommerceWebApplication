/**
 * service.js  (ES Module — v3)
 *
 * Ollama integration with live PostgreSQL context.
 * Uses import/export — compatible with "type": "module" in package.json.
 */

import { buildDBContext } from "../../config/db-context.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || "llama3:latest";

// ─── Base System Prompt ───────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are Maya, a friendly and knowledgeable customer service assistant for MyStore — a modern ecommerce platform based in Malaysia.

Your personality: warm, efficient, professional, and empathetic. Keep responses concise (2–5 sentences) unless a step-by-step is genuinely needed.

You have LIVE access to the customer's real data (orders, cart, products). When live data appears in the "LIVE DATA" block below, USE IT to answer specifically and accurately. Never say "I don't have access to your data" if live data was provided.

== WHAT YOU CAN HELP WITH ==
- 📦 Order status & tracking (real-time data)
- 🛒 Cart contents & checkout issues
- 🛍️ Product availability, pricing & stock
- 💳 Payment issues (Stripe)
- 🔐 Account problems (login, registration, password reset)
- 📍 Shipping address management
- ⭐ Product reviews (only after confirmed purchase)
- ❌ Order cancellation (only if NOT yet shipped or delivered)

== STORE POLICIES ==
- Orders CAN be cancelled if status is "pending" or "processing"
- Orders CANNOT be cancelled if status is "shipped" or "delivered"
- Reviews can only be submitted after a confirmed purchase of that product
- All prices are in Malaysian Ringgit — always format as "RM X.XX"

== RESPONSE RULES ==
- Reference live data directly and specifically when available
- If user is not logged in and asks about their data, ask them to log in first
- If cart has stock issues, proactively mention it
- Never invent order IDs, prices, or tracking numbers
- For issues outside your scope: "Please email support@mystore.com"
- Keep responses friendly and concise`;

// ─── Build full system prompt ─────────────────────────────────────────────────
const buildSystemPrompt = (userContext, contextBlock, intent) => {
  let prompt = BASE_SYSTEM_PROMPT;

  if (userContext) {
    prompt += `\n\n== CURRENT CUSTOMER ==
Name: ${userContext.name || "Unknown"}
Email: ${userContext.email || "Unknown"}
User ID: ${userContext.userId}
Admin: ${userContext.isAdmin ? "Yes" : "No"}`;
  } else {
    prompt += `\n\n== CURRENT CUSTOMER ==\nNot logged in (Guest user)`;
  }

  if (contextBlock) {
    prompt += `\n\n== LIVE DATA FROM DATABASE ==\n${contextBlock}\n== END OF LIVE DATA ==`;
    prompt += `\n\nIMPORTANT: The data above was freshly fetched from the database. Use it to give a specific, accurate answer.`;
  }

  if (intent && intent !== "GENERAL") {
    prompt += `\n\n[Detected intent: ${intent}]`;
  }

  return prompt;
};

// ─── Chat (standard) ─────────────────────────────────────────────────────────
export const chat = async (messages, userContext = null, pool = null) => {
  let contextBlock = "";
  let intent = "GENERAL";

  if (pool) {
    const userId = userContext?.userId || null;
    ({ contextBlock, intent } = await buildDBContext(pool, userId, userContext, messages));
  }

  const systemPrompt = buildSystemPrompt(userContext, contextBlock, intent);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20),
      ],
      stream: false,
      options: { temperature: 0.6, top_p: 0.9, num_predict: 512 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return (
    data.message?.content ||
    "I'm sorry, I couldn't generate a response. Please try again."
  );
};

// ─── Chat (streaming / SSE) ───────────────────────────────────────────────────
export const chatStream = async (messages, userContext = null, pool = null, onChunk) => {
  let contextBlock = "";
  let intent = "GENERAL";

  if (pool) {
    const userId = userContext?.userId || null;
    ({ contextBlock, intent } = await buildDBContext(pool, userId, userContext, messages));
  }

  const systemPrompt = buildSystemPrompt(userContext, contextBlock, intent);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20),
      ],
      stream: true,
      options: { temperature: 0.6, top_p: 0.9, num_predict: 512 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama stream error: ${response.status}`);

  let buffer = "";
  for await (const chunk of response.body) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const token = parsed.message?.content || "";
        if (token) onChunk(token);
        if (parsed.done) return;
      } catch {
        // skip malformed chunks
      }
    }
  }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
export const healthCheck = async () => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, error: "Ollama unreachable" };

    const data = await response.json();
    const models = data.models || [];
    const modelAvailable = models.some((m) =>
      m.name.startsWith(OLLAMA_MODEL.split(":")[0])
    );

    return {
      ok: true,
      model: OLLAMA_MODEL,
      modelAvailable,
      availableModels: models.map((m) => m.name),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
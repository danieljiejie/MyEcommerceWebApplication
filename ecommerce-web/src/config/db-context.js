/**
 * db-context.js 
 *
 * Fetches real data from PostgreSQL based on user intent,
 * then returns a context string to inject into Maya's system prompt.
 */

// ─── Intent Detection ─────────────────────────────────────────────────────────
export const detectIntent = (message) => {
    const msg = message.toLowerCase();
  
    const intents = {
      ORDER_STATUS: [
        "order status", "where is my order", "my order", "track", "tracking",
        "order #", "order id", "shipment", "shipped", "delivery", "deliver",
        "when will i receive", "dispatch", "parcel",
      ],
      ORDER_HISTORY: [
        "order history", "past orders", "previous orders", "all my orders",
        "orders i made", "my purchases", "purchase history",
      ],
      CART: [
        "my cart", "cart", "what's in my cart", "items in cart",
        "cart total", "cart summary", "checkout", "basket",
      ],
      PRODUCT_SEARCH: [
        "do you have", "is there", "looking for", "find", "search",
        "stock", "in stock", "available", "product", "price of", "how much is",
        "show me", "any ", "sell ",
      ],
      CANCEL_ORDER: [
        "cancel", "cancell", "stop my order", "don't want", "refund",
      ],
      RETURN: [
        "return", "send back", "wrong item", "damaged", "broken", "defective",
      ],
      PAYMENT: [
        "payment", "paid", "charge", "billing", "invoice", "receipt", "stripe",
      ],
      ACCOUNT: [
        "password", "login", "sign in", "account", "profile", "email", "register",
      ],
      ADDRESS: [
        "address", "shipping address", "delivery address", "change address",
      ],
      REVIEW: [
        "review", "rating", "feedback", "leave a review", "write a review",
      ],
    };
  
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((kw) => msg.includes(kw))) return intent;
    }
    return "GENERAL";
  };
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const extractOrderId = (message) => {
    const uuidMatch = message.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    if (uuidMatch) return uuidMatch[0];
  
    const shortMatch = message.match(/(?:#|order\s+)([a-z0-9]{6,})/i);
    if (shortMatch) return shortMatch[1];
  
    return null;
  };
  
  const extractProductKeyword = (message) =>
    message
      .replace(
        /do you (have|sell)|is there|looking for|find|search for|any |show me|in stock|available|price of|how much is/gi,
        ""
      )
      .replace(/[?!.,]/g, "")
      .trim()
      .substring(0, 60);
  
  // ─── DB Queries ───────────────────────────────────────────────────────────────
  const fetchOrderById = async (pool, orderId, userId, isAdmin = false) => {
    try {
      const orderQuery = isAdmin
        ? `SELECT o.id, o.status, o.total_amount, o.shipping_address,
                  o.payment_intent_id, o.created_at, o.updated_at,
                  u.first_name, u.last_name, u.email
           FROM orders o
           LEFT JOIN users u ON o.user_id = u.id
           WHERE o.id::text ILIKE $1 OR o.id::text ILIKE $1 || '%'
           LIMIT 1`
        : `SELECT o.id, o.status, o.total_amount, o.shipping_address,
                  o.created_at, o.updated_at
           FROM orders o
           WHERE (o.id::text ILIKE $1 OR o.id::text ILIKE $1 || '%')
             AND o.user_id = $2
           LIMIT 1`;
  
      const params = isAdmin ? [orderId] : [orderId, userId];
      const orderRes = await pool.query(orderQuery, params);
      if (orderRes.rows.length === 0) return null;
  
      const order = orderRes.rows[0];
      const itemsRes = await pool.query(
        `SELECT oi.quantity, oi.price_at_purchase,
                p.name AS product_name, p.image_url, p.is_active
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
  
      return { ...order, items: itemsRes.rows };
    } catch (err) {
      console.error("[DB] fetchOrderById error:", err.message);
      return null;
    }
  };
  
  const fetchUserOrders = async (pool, userId, limit = 5) => {
    try {
      const res = await pool.query(
        `SELECT o.id, o.status, o.total_amount, o.created_at,
                COUNT(oi.id) AS item_count
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return res.rows;
    } catch (err) {
      console.error("[DB] fetchUserOrders error:", err.message);
      return [];
    }
  };
  
  const fetchUserCart = async (pool, userId) => {
    try {
      const cartRes = await pool.query(
        `SELECT id FROM carts WHERE user_id = $1`,
        [userId]
      );
      if (cartRes.rows.length === 0) return null;
  
      const cartId = cartRes.rows[0].id;
      const itemsRes = await pool.query(
        `SELECT ci.quantity, ci.id AS cart_item_id,
                p.name, p.price, p.stock_quantity, p.is_active, p.image_url
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = $1
         ORDER BY ci.created_at DESC`,
        [cartId]
      );
  
      const items = itemsRes.rows;
      const total = items
        .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
        .toFixed(2);
      const hasStockIssue = items.some(
        (item) => !item.is_active || item.stock_quantity < item.quantity
      );
  
      return { cartId, items, total, hasStockIssue };
    } catch (err) {
      console.error("[DB] fetchUserCart error:", err.message);
      return null;
    }
  };
  
  const searchProducts = async (pool, keyword, limit = 5) => {
    try {
      const res = await pool.query(
        `SELECT p.name, p.price, p.stock_quantity, p.is_active,
                c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = TRUE
           AND (p.name ILIKE $1 OR p.description ILIKE $1 OR c.name ILIKE $1)
         ORDER BY p.stock_quantity DESC
         LIMIT $2`,
        [`%${keyword}%`, limit]
      );
      return res.rows;
    } catch (err) {
      console.error("[DB] searchProducts error:", err.message);
      return [];
    }
  };
  
  // ─── Formatters ───────────────────────────────────────────────────────────────
  const statusEmoji = {
    pending: "⏳", processing: "⚙️", shipped: "🚚",
    delivered: "✅", cancelled: "❌", returned: "↩️",
  };
  
  const formatOrder = (order) => {
    if (!order) return "No order found matching that ID for your account.";
  
    const lines = [
      `Order ID: ${order.id}`,
      `Status: ${statusEmoji[order.status] || "📦"} ${order.status.toUpperCase()}`,
      `Total: RM ${parseFloat(order.total_amount).toFixed(2)}`,
      `Shipping to: ${order.shipping_address}`,
      `Placed on: ${new Date(order.created_at).toLocaleDateString("en-MY", { dateStyle: "long" })}`,
    ];
  
    if (order.items?.length > 0) {
      lines.push(
        `Items: ${order.items
          .map((i) => `${i.product_name} x${i.quantity} (RM ${parseFloat(i.price_at_purchase).toFixed(2)} each)`)
          .join(", ")}`
      );
    }
  
    if (["pending", "processing"].includes(order.status)) {
      lines.push("Note: This order CAN still be cancelled.");
    } else if (["shipped", "delivered"].includes(order.status)) {
      lines.push(`Note: This order CANNOT be cancelled (already ${order.status}).`);
    }
  
    return lines.join("\n");
  };
  
  const formatOrderHistory = (orders) => {
    if (!orders?.length) return "This user has no orders yet.";
    return orders
      .map(
        (o, i) =>
          `${i + 1}. Order ${o.id.substring(0, 8)}... | Status: ${o.status} | ` +
          `Total: RM ${parseFloat(o.total_amount).toFixed(2)} | ${o.item_count} item(s) | ` +
          `Placed: ${new Date(o.created_at).toLocaleDateString("en-MY")}`
      )
      .join("\n");
  };
  
  const formatCart = (cart) => {
    if (!cart) return "This user has no active cart.";
    if (!cart.items.length) return "The user's cart is empty.";
  
    const lines = cart.items.map(
      (item) =>
        `- ${item.name} x${item.quantity} @ RM ${parseFloat(item.price).toFixed(2)}` +
        (item.stock_quantity < item.quantity ? ` ⚠️ [Only ${item.stock_quantity} in stock!]` : "") +
        (!item.is_active ? ` ❌ [Product no longer available]` : "")
    );
    lines.push(`Cart Total: RM ${cart.total}`);
    if (cart.hasStockIssue) {
      lines.push("⚠️ Stock/availability issues must be resolved before checkout.");
    }
    return lines.join("\n");
  };
  
  const formatProducts = (products, keyword) => {
    if (!products?.length) return `No active products found matching "${keyword}".`;
    return products
      .map(
        (p) =>
          `- ${p.name} | RM ${parseFloat(p.price).toFixed(2)} | ` +
          `Stock: ${p.stock_quantity} | Category: ${p.category_name || "N/A"}`
      )
      .join("\n");
  };
  
  // ─── Main Export ──────────────────────────────────────────────────────────────
  export const buildDBContext = async (pool, userId, userProfile, messages) => {
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
  
    const intent = detectIntent(lastUserMsg);
    const isAdmin = userProfile?.isAdmin || false;
    const lines = [];
  
    try {
      if (intent === "ORDER_STATUS" || intent === "CANCEL_ORDER") {
        const orderId = extractOrderId(lastUserMsg);
        if (orderId && userId) {
          const order = await fetchOrderById(pool, orderId, userId, isAdmin);
          lines.push("=== ORDER DETAILS FROM DATABASE ===");
          lines.push(formatOrder(order));
        } else if (userId) {
          const recent = await fetchUserOrders(pool, userId, 1);
          if (recent.length > 0) {
            const order = await fetchOrderById(pool, recent[0].id, userId, isAdmin);
            lines.push("=== MOST RECENT ORDER ===");
            lines.push(formatOrder(order));
            lines.push(
              "(User did not specify an order ID — showing most recent order. Ask them to confirm.)"
            );
          } else {
            lines.push("This user has no orders in the system.");
          }
        } else {
          lines.push("User is not logged in — cannot retrieve order data. Ask them to log in.");
        }
      }
  
      if (intent === "ORDER_HISTORY") {
        if (userId) {
          const orders = await fetchUserOrders(pool, userId, 5);
          lines.push("=== USER ORDER HISTORY (last 5) ===");
          lines.push(formatOrderHistory(orders));
        } else {
          lines.push("User is not logged in — cannot retrieve order history.");
        }
      }
  
      if (intent === "CART") {
        if (userId) {
          const cart = await fetchUserCart(pool, userId);
          lines.push("=== USER CART CONTENTS ===");
          lines.push(formatCart(cart));
        } else {
          lines.push("User is not logged in — cannot retrieve cart data.");
        }
      }
  
      if (intent === "PRODUCT_SEARCH") {
        const keyword = extractProductKeyword(lastUserMsg);
        if (keyword.length > 1) {
          const products = await searchProducts(pool, keyword);
          lines.push(`=== PRODUCT SEARCH RESULTS for "${keyword}" ===`);
          lines.push(formatProducts(products, keyword));
        }
      }
    } catch (err) {
      console.error("[DB Context] Error:", err.message);
      lines.push("Note: Live data temporarily unavailable. Answer using general knowledge.");
    }
  
    return {
      contextBlock: lines.join("\n"),
      intent,
    };
  };
// src/services/api.js

/* ================================
   BASE URLS
================================ */

// READ-ONLY product source
const PRODUCTS_URL =
  "https://kolzsticks.github.io/Free-Ecommerce-Products-Api/main/products.json";

// Your backend (Node + PostgreSQL)
const BACKEND_URL = "http://localhost:5000/api";

/* ================================
   HELPER: BACKEND FETCH
================================ */

async function backendFetch(endpoint, options = {}) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // useful if you later use cookies/JWT
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Backend request failed");
  }

  return res.json();
}

/* ================================
   PRODUCTS (STATIC API)
================================ */

// Get all products
export const getProducts = async () => {
  const res = await fetch(PRODUCTS_URL);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
};

// Get product by ID
export const getProductById = async (id) => {
  const products = await getProducts();
  return products.find((p) => p.id === id);
};

// Search products by name
export const searchProducts = async (query) => {
  const products = await getProducts();
  return products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
};

// Get unique categories
export const getCategories = async () => {
  const products = await getProducts();
  return [...new Set(products.map((p) => p.category))];
};

/* ================================
   AUTH (BACKEND)
================================ */

export const loginUser = (credentials) =>
  backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const registerUser = (data) =>
  backendFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getCurrentUser = () =>
  backendFetch("/auth/me");

export const logoutUser = () =>
  backendFetch("/auth/logout", {
    method: "POST",
  });

/* ================================
   CART (POSTGRESQL)
================================ */

// Get user cart
export const getCart = (userId) =>
  backendFetch(`/cart/${userId}`);

// Add item to cart
export const addToCart = (userId, product, quantity = 1) =>
  backendFetch(`/cart/${userId}/items`, {
    method: "POST",
    body: JSON.stringify({
      product_id: product.id,
      name: product.name,
      image: product.image,
      price_cents: product.priceCents,
      quantity,
    }),
  });

// Update cart item quantity
export const updateCartItem = (cartItemId, quantity) =>
  backendFetch(`/cart/items/${cartItemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });

// Remove item from cart
export const removeCartItem = (cartItemId) =>
  backendFetch(`/cart/items/${cartItemId}`, {
    method: "DELETE",
  });

// Clear cart
export const clearCart = (userId) =>
  backendFetch(`/cart/${userId}`, {
    method: "DELETE",
  });

/* ================================
   ORDERS (POSTGRESQL)
================================ */

// Create order from cart
export const createOrder = (userId, payload) =>
  backendFetch(`/orders/${userId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Get user orders
export const getUserOrders = (userId) =>
  backendFetch(`/orders/user/${userId}`);

// Get order detail
export const getOrderById = (orderId) =>
  backendFetch(`/orders/${orderId}`);

/* ================================
   CHECKOUT HELPERS
================================ */

// Price formatter
export const formatPrice = (priceCents) =>
  `$${(priceCents / 100).toFixed(2)}`;
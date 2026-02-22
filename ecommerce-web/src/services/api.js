// src/services/api.js

/* ================================
   BASE CONFIG
================================ */

const API_BASE_URL = "http://localhost:5000/api";

/* ================================
   HELPER: BACKEND FETCH
================================ */

/**
 * Wrapper for fetch that handles headers, auth tokens, and error parsing.
 * Automatically attaches 'Authorization: Bearer <token>' if found in localStorage.
 */
async function backendFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 1. Handle Bearer Token automatically
  const token = localStorage.getItem("token"); // Adjust key if you use specific name like 'authToken'
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 2. Build Query String if params provided
  let url = `${API_BASE_URL}${endpoint}`;
  if (options.params) {
    const queryParams = new URLSearchParams(options.params).toString();
    url += `?${queryParams}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 3. Parse JSON response or throw error
  let data;
  try {
    data = await response.json();
  } catch (err) {
    // If response isn't JSON (e.g., 404 HTML or empty), handle gracefully
    data = null; 
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || "API request failed";
    throw new Error(errorMessage);
  }

  return data;
}

/* ================================
   1. AUTHENTICATION
================================ */

export const registerUser = (userData) => 
  backendFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData), // { email, password, first_name, ... }
  });

export const loginUser = (credentials) => 
  backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials), // { email, password }
  });

export const loginWithGoogle = (googleIdToken) => 
  backendFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify({ token: googleIdToken }),
  });

export const logoutUser = () => 
  backendFetch("/auth/logout", {
    method: "POST",
  });

export const getCurrentUser = () => 
  backendFetch("/auth/me");

export const updateProfile = (userId, data) =>
  backendFetch(`/auth/users/${userId}`, { // Added /auth prefix based on your files
    method: "PUT",
    body: JSON.stringify(data),
  });


export const changePassword = (userId, data) =>
  backendFetch(`/auth/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const forgotPassword = (email) =>
  backendFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

// Step 2: Verify the 6-digit OTP → receives resetToken
// POST /api/auth/verify-otp
export const verifyOTP = (email, otp) =>
  backendFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

// Step 3: Set a new password using the resetToken from step 2
// POST /api/auth/reset-password
export const resetPassword = (email, resetToken, newPassword) =>
  backendFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
 

/* ================================
   2. PRODUCTS & CATEGORIES
================================ */

// Get all products (supports filtering via params like { min_price: 100 })
export const getProducts = (filters = {}) => 
  backendFetch("/products", { params: filters });

// Get single product
export const getProductById = (id) => 
  backendFetch(`/products/${id}`);

// Search products
export const searchProducts = (query) => 
  backendFetch("/products/search", { params: { q: query } });

// Get all categories
export const getCategories = () => 
  backendFetch("/categories");

// Get category by slug
export const getCategoryBySlug = (slug) => 
  backendFetch(`/categories/slug/${slug}`);



/* ================================
   3. CART
================================ */

// Get user cart
export const getCart = (userId) => 
  backendFetch(`/cart/${userId}`);

// Add item to cart
export const addToCart = (userId, productPayload) => 
  backendFetch(`/cart/${userId}/items`, {
    method: "POST",
    body: JSON.stringify(productPayload), // { product_id, quantity }
  });

// Update cart item quantity
export const updateCartItem = (userId, cartItemId, quantity) => 
  backendFetch(`/cart/${userId}/items/${cartItemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });

// Bulk update cart items
export const bulkUpdateCart = (userId, updates) => 
  backendFetch(`/cart/${userId}/items`, {
    method: "PUT",
    body: JSON.stringify({ updates }), // { updates: [{ cart_item_id, quantity }] }
  });

// Remove specific item
export const removeCartItem = (userId, productId) => 
  backendFetch(`/cart/${userId}/items/${productId}`, {
    method: "DELETE",
  });

// Clear entire cart
export const clearCart = (userId) => 
  backendFetch(`/cart/${userId}`, {
    method: "DELETE",
  });

// Get Cart Summary
export const getCartSummary = (userId) => 
  backendFetch(`/cart/${userId}/summary`);

// Validate Cart (Before Checkout)
export const validateCart = (userId) => 
  backendFetch(`/cart/${userId}/validate`);

// Get Cart Item Count
export const getCartCount = (userId) => 
  backendFetch(`/cart/${userId}/count`);


/* ================================
   4. ORDERS
================================ */

// Create Order
export const createOrder = (orderData) => 
  backendFetch("/orders", {
    method: "POST",
    body: JSON.stringify(orderData), // { shipping_address, payment_intent_id, ... }
  });

// Get Current User Orders (with optional filters)
export const getMyOrders = (filters = {}) => 
  backendFetch("/orders/me", { params: filters });

// Get Current User Stats
export const getMyOrderStats = () => 
  backendFetch("/orders/me/stats");

// Get Recent Orders
export const getRecentOrders = (limit = 3) => 
  backendFetch("/orders/me/recent", { params: { limit } });

// Get Single Order
export const getOrderById = (orderId) => 
  backendFetch(`/orders/${orderId}`);

// Get Order Timeline
export const getOrderTimeline = (orderId) => 
  backendFetch(`/orders/${orderId}/timeline`);

// Cancel Order
export const cancelOrder = (orderId) => 
  backendFetch(`/orders/${orderId}/cancel`, {
    method: "PUT",
  });

// Check if user can review an order
export const checkCanReview = (orderId) => 
  backendFetch(`/orders/${orderId}/can-review`);

export const getOrderWithProducts = (orderId) => 
  backendFetch(`/orders/product/${orderId}`);


/* ================================
   5. REVIEWS
================================ */

// Create Review
export const createReview = (productId, reviewData) => 
  backendFetch(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(reviewData), // { rating, comment }
  });

// Get Product Reviews
export const getProductReviews = (productId) => 
  backendFetch(`/products/${productId}/reviews`);

// Get Rating Stats
export const getProductReviewStats = (productId) => 
  backendFetch(`/products/${productId}/reviews/stats`);

// Update Review
export const updateReview = (productId, reviewId, reviewData) => 
  backendFetch(`/products/${productId}/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(reviewData),
  });

export const checkUserReview = (productId) =>
  backendFetch(`/products/${productId}/reviews/check`);

// Delete Review
export const deleteReview = (productId, reviewId) => 
  backendFetch(`/products/${productId}/reviews/${reviewId}`, {
    method: "DELETE",
  });

// Get Featured Reviews
export const getFeaturedReviews = (limit = 5) => 
  backendFetch("/reviews/featured", { params: { limit } });

// Get Current User Reviews
export const getMyReviews = () => 
  backendFetch("/reviews/me/reviews");


/* ================================
   6. ADDRESS MANAGEMENT
================================ */

// Get All Addresses
export const getAddresses = (userId) => 
  backendFetch(`/users/${userId}/addresses`);

// Create Address
export const createAddress = (userId, addressData) => 
  backendFetch(`/users/${userId}/addresses`, {
    method: "POST",
    body: JSON.stringify(addressData),
  });

// Validate Address (No save)
export const validateAddress = (userId, addressData) => 
  backendFetch(`/users/${userId}/addresses/validate`, {
    method: "POST",
    body: JSON.stringify(addressData),
  });

// Get Single Address
export const getAddressById = (userId, addressId) => 
  backendFetch(`/users/${userId}/addresses/${addressId}`);

// Update Address
export const updateAddress = (userId, addressId, addressData) => 
  backendFetch(`/users/${userId}/addresses/${addressId}`, {
    method: "PUT",
    body: JSON.stringify(addressData),
  });

// Delete Address
export const deleteAddress = (userId, addressId) => 
  backendFetch(`/users/${userId}/addresses/${addressId}`, {
    method: "DELETE",
  });

// Set Default Address
export const setDefaultAddress = (userId, addressId) => 
  backendFetch(`/users/${userId}/addresses/${addressId}/set-default`, {
    method: "PUT",
  });

// Get Default Address
export const getDefaultAddress = (userId) => 
  backendFetch(`/users/${userId}/addresses/default`);

// Check if user has addresses
export const checkHasAddress = (userId) => 
  backendFetch(`/users/${userId}/addresses/check`);

/* ================================
   8. PAYMENTS
================================ */

// Create a Stripe PaymentIntent — called before card confirmation
// POST /api/payments/create-intent
// amount_cents: total in cents (e.g. $29.99 → 2999)
// Returns: { clientSecret, paymentIntentId }
export const createPaymentIntent = (amount_cents, currency = "usd") =>
  backendFetch("/payments/create-intent", {
    method: "POST",
    body: JSON.stringify({ amount_cents, currency }),
  });

// Optional: verify a PaymentIntent status server-side after confirmation
// GET /api/payments/verify/:paymentIntentId
export const verifyPaymentIntent = (paymentIntentId) =>
  backendFetch(`/payments/verify/${paymentIntentId}`);
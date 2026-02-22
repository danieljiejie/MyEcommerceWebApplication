import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem,
  removeCartItem,
  clearCart as apiClearCart,
  getCartCount,
} from "../services/api";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  const [cart, setCart] = useState({ items: [], subtotal: "0", total_items: 0 });
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch cart from backend when user logs in ──────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchCart();
    } else {
      // User logged out - clear cart
      setCart({ items: [], subtotal: "0", total_items: 0 });
      setCartCount(0);
    }
  }, [isAuthenticated, user?.id]);

  // ── Fetch full cart data ───────────────────────────────────────────────────
  const fetchCart = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getCart(user.id);
      // Backend returns: { id, user_id, items: [...], subtotal, total_items }
      setCart(data);
      setCartCount(data.total_items || 0);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch just the cart count (lighter than full cart) ─────────────────────
  const fetchCartCount = async () => {
    if (!user?.id) return;
    
    try {
      const data = await getCartCount(user.id);
      setCartCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch cart count:", err);
    }
  };

  // ── Add item to cart ────────────────────────────────────────────────────────
  const addToCart = async ({ product_id, quantity = 1 }) => {
    if (!isAuthenticated || !user?.id) {
      throw new Error("Please login to add items to cart");
    }

    setLoading(true);
    setError(null);
    try {
      // POST /api/cart/:userId/items
      await apiAddToCart(user.id, { product_id, quantity });
      
      // Refetch cart to get updated data
      await fetchCart();
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Update cart item quantity ───────────────────────────────────────────────
  const updateQuantity = async (cart_item_id, quantity) => {
    if (!user?.id) return;

    // Optimistic update
    const previousCart = { ...cart };
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.cart_item_id === cart_item_id ? { ...item, quantity } : item
      ),
    }));

    try {
      // PUT /api/cart/:userId/items/:cart_item_id
      await updateCartItem(user.id, cart_item_id, quantity);
      
      // Refetch to get accurate subtotal and totals
      await fetchCart();
    } catch (err) {
      console.error("Failed to update quantity:", err);
      // Rollback on error
      setCart(previousCart);
      setError(err.message);
      throw err;
    }
  };

  // ── Remove item from cart ───────────────────────────────────────────────────
  const removeFromCart = async (cart_item_id) => {
    if (!user?.id) return;

    // Optimistic update
    const previousCart = { ...cart };
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.cart_item_id !== cart_item_id),
    }));

    try {
      // DELETE /api/cart/:userId/items/:product_id
      await removeCartItem(user.id, cart_item_id);
      
      // Refetch to get accurate counts
      await fetchCart();
    } catch (err) {
      console.error("Failed to remove from cart:", err);
      // Rollback on error
      setCart(previousCart);
      setError(err.message);
      throw err;
    }
  };

  // ── Clear entire cart ───────────────────────────────────────────────────────
  const clearCart = async () => {
    if (!user?.id) return;

    const previousCart = { ...cart };
    setCart({ items: [], subtotal: "0", total_items: 0 });
    setCartCount(0);

    try {
      // DELETE /api/cart/:userId
      await apiClearCart(user.id);
    } catch (err) {
      console.error("Failed to clear cart:", err);
      setCart(previousCart);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    // State
    cart: cart.items || [],  // Expose just the items array for easier usage
    cartData: cart,          // Full cart object with subtotal, etc.
    cartCount,
    loading,
    error,
    
    // Methods
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
    fetchCartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
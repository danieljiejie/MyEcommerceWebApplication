import {
  getUserCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart,
  isProductInCart,
  getCartItemCount,
  updateCartItems
} from "./cart.services.js";

/**
 * GET /api/cart/:userId
 * Get user's cart with all items
 */
export const getCartControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only view their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only view your own cart' 
      });
    }

    const cart = await getUserCart(userId);
    res.json(cart);
  } catch (error) {
    console.error('Get cart controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/cart/:userId/items
 * Add item to cart
 */
export const addToCartControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only add to their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only add items to your own cart' 
      });
    }

    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const result = await addToCart(userId, product_id, parseInt(quantity));
    
    res.status(201).json({
      message: `Item ${result.action} successfully`,
      ...result
    });
  } catch (error) {
    console.error('Add to cart controller error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not available') || error.message.includes('stock')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/cart/:userId/items/:cartItemId
 * Update cart item quantity
 */
export const updateCartItemControl = async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only update their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only update items in your own cart' 
      });
    }

    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Valid quantity is required (minimum 1)' });
    }

    const cartItem = await updateCartItemQuantity(userId, cartItemId, parseInt(quantity));
    
    res.json({
      message: 'Cart item updated successfully',
      cart_item: cartItem
    });
  } catch (error) {
    console.error('Update cart item controller error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not available') || error.message.includes('stock') || error.message.includes('own cart')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/cart/:userId/items/:cartItemId
 * Remove item from cart
 */
export const removeFromCartControl = async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only remove from their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only remove items from your own cart' 
      });
    }

    const cartItem = await removeFromCart(userId, cartItemId);
    
    res.json({
      message: 'Item removed from cart successfully',
      cart_item: cartItem
    });
  } catch (error) {
    console.error('Remove from cart controller error:', error);
    
    if (error.message.includes('not found') || error.message.includes('own cart')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/cart/:userId
 * Clear entire cart
 */
export const clearCartControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only clear their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only clear your own cart' 
      });
    }

    const result = await clearCart(userId);
    
    res.json({
      message: 'Cart cleared successfully',
      ...result
    });
  } catch (error) {
    console.error('Clear cart controller error:', error);
    
    if (error.message === 'Cart not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/cart/:userId/summary
 * Get cart summary (item count, total price)
 */
export const getCartSummaryControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only view their own cart summary
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only view your own cart summary' 
      });
    }

    const summary = await getCartSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('Get cart summary controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/cart/:userId/validate
 * Validate cart before checkout
 */
export const validateCartControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only validate their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only validate your own cart' 
      });
    }

    const validation = await validateCart(userId);
    
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    res.json(validation);
  } catch (error) {
    console.error('Validate cart controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/cart/:userId/check/:productId
 * Check if product is in cart
 */
export const checkProductInCartControl = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only check their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only check your own cart' 
      });
    }

    const result = await isProductInCart(userId, productId);
    res.json(result);
  } catch (error) {
    console.error('Check product in cart controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/cart/:userId/count
 * Get cart item count
 */
export const getCartItemCountControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only check their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only check your own cart' 
      });
    }

    const count = await getCartItemCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Get cart item count controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/cart/:userId/items
 * Update multiple cart items at once
 */
export const updateCartItemsControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.is_admin || false;

    // Users can only update their own cart
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only update items in your own cart' 
      });
    }

    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ 
        message: 'Updates array is required' 
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        message: 'At least one update is required' 
      });
    }

    const result = await updateCartItems(userId, updates);
    
    res.json({
      message: `${result.updated_count} items updated successfully`,
      ...result
    });
  } catch (error) {
    console.error('Update cart items controller error:', error);
    res.status(500).json({ message: error.message });
  }
};
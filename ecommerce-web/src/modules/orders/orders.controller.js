import {
  createOrderFromCart,
  createInstantOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  getUserOrderStats,
  getAllOrders,
  getOrderStatusHistory,
  canReviewOrderProducts,
  getRecentOrders,
  getOrderWithProducts
} from "./orders.services.js";

/**
 * POST /api/orders
 * Handle both "Cart Checkout" and "Buy Now"
 */
export const createOrderControl = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderData = req.body;

    // Common Validation
    if (!orderData.shipping_address) {
      return res.status(400).json({ 
        message: 'Shipping address is required' 
      });
    }

    let order;

    // DECISION: Is this a "Buy Now" or "Cart Checkout"?
    if (orderData.product_id) {
      // --- Scenario A: Buy Now (Direct) ---
      // Requires product_id and quantity
      if (!orderData.quantity || orderData.quantity < 1) {
        return res.status(400).json({ message: 'Quantity is required for Buy Now' });
      }
      
      order = await createInstantOrder(userId, orderData);

    } else {
      // --- Scenario B: Cart Checkout ---
      // Uses existing items in the cart
      order = await createOrderFromCart(userId, orderData);
    }
    
    res.status(201).json({
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('Create order controller error:', error);
    
    // Handle expected domain errors with 400 Bad Request
    if (
      error.message.includes('Cart') || 
      error.message.includes('stock') || 
      error.message.includes('available') ||
      error.message.includes('found')
    ) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/:orderId
 * Get single order by ID
 */
export const getOrderByIdControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    const order = await getOrderById(orderId, userId, isAdmin);
    res.json(order);
  } catch (error) {
    console.error('Get order by ID controller error:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/user/:userId
 * Get all orders for a user
 */
export const getUserOrdersControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    // Users can only view their own orders
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only view your own orders' 
      });
    }

    const options = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      sort: req.query.sort || 'created_at',
      order: req.query.order || 'DESC'
    };

    const result = await getUserOrders(userId, options);
    res.json(result);
  } catch (error) {
    console.error('Get user orders controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/me
 * Get current user's orders
 */
export const getMyOrdersControl = async (req, res) => {
  try {
    const userId = req.user.id;

    const options = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      sort: req.query.sort || 'created_at',
      order: req.query.order || 'DESC'
    };

    const result = await getUserOrders(userId, options);
    res.json(result);
  } catch (error) {
    console.error('Get my orders controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/orders/:orderId/status
 * Update order status
 */
export const updateOrderStatusControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Only admins can change status to most states
    // Users can only cancel their own pending orders
    if (!isAdmin && status !== 'cancelled') {
      return res.status(403).json({ 
        message: 'Only administrators can update order status' 
      });
    }

    const order = await updateOrderStatus(orderId, status, userId, isAdmin);
    
    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status controller error:', error);
    
    if (error.message.includes('Invalid') || error.message.includes('Cannot change') || error.message === 'Order not found') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/orders/:orderId/cancel
 * Cancel order
 */
export const cancelOrderControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    const order = await cancelOrder(orderId, userId, isAdmin);
    
    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order controller error:', error);
    
    if (error.message.includes('Cannot change') || error.message === 'Order not found') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/user/:userId/stats
 * Get order statistics for user
 */
export const getUserOrderStatsControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    // Users can only view their own stats
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ 
        message: 'You can only view your own statistics' 
      });
    }

    const stats = await getUserOrderStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get user order stats controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/me/stats
 * Get current user's order statistics
 */
export const getMyOrderStatsControl = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await getUserOrderStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get my order stats controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/admin/all
 * Get all orders (Admin only)
 */
export const getAllOrdersControl = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      min_amount: req.query.min_amount ? parseFloat(req.query.min_amount) : undefined,
      max_amount: req.query.max_amount ? parseFloat(req.query.max_amount) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      sort: req.query.sort || 'created_at',
      order: req.query.order || 'DESC'
    };

    const orders = await getAllOrders(filters);
    res.json(orders);
  } catch (error) {
    console.error('Get all orders controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/:orderId/timeline
 * Get order status history/timeline
 */
export const getOrderTimelineControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin || false;

    // Verify user owns order or is admin
    const order = await getOrderById(orderId, userId, isAdmin);
    
    const timeline = await getOrderStatusHistory(orderId);
    res.json(timeline);
  } catch (error) {
    console.error('Get order timeline controller error:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/:orderId/can-review
 * Check if user can review products from order
 */
export const canReviewOrderControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const canReview = await canReviewOrderProducts(orderId, userId);
    
    res.json({ 
      can_review: canReview,
      message: canReview ? 'You can review products from this order' : 'Order must be delivered to leave reviews'
    });
  } catch (error) {
    console.error('Can review order controller error:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/me/recent
 * Get recent orders for current user
 */
export const getRecentOrdersControl = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;

    const orders = await getRecentOrders(userId, limit);
    res.json(orders);
  } catch (error) {
    console.error('Get recent orders controller error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/product
 *
 */
export const getOrderWithProductsControl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id; // Get the user ID from the authenticate middleware
    const isAdmin = req.user.is_admin === true;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // ✅ FIX: Pass userId and isAdmin so the query works correctly
    const orders = await getOrderWithProducts(orderId, userId, isAdmin);

    res.json(orders);
  } catch (error) {
    console.error("Get order with products controller error:", error);
    // If it's the "Access denied" error you threw, return 403
    if (error.message.includes("Order not found or access denied")) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};
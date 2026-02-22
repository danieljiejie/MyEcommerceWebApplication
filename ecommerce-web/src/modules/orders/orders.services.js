import db from "../../config/db.js";

/**
 * Create order from cart
 */
export const createOrderFromCart = async (userId, orderData) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { shipping_address, payment_intent_id } = orderData;

    // Validate shipping address
    if (!shipping_address) {
      throw new Error('Shipping address is required');
    }

    // Get cart with items
    const cart = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cart.rows.length === 0) {
      throw new Error('Cart not found');
    }

    const cartId = cart.rows[0].id;

    // Get cart items with product details
    const cartItems = await client.query(`
      SELECT 
        ci.id as cart_item_id,
        ci.product_id,
        ci.quantity,
        p.name as product_name,
        p.price,
        p.stock_quantity,
        p.is_active
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
    `, [cartId]);

    if (cartItems.rows.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate all items
    let totalAmount = 0;
    const invalidItems = [];
    const outOfStockItems = [];

    for (const item of cartItems.rows) {
      // Check if product is active
      if (!item.is_active) {
        invalidItems.push(`${item.product_name} is no longer available`);
        continue;
      }

      // Check stock availability
      if (item.quantity > item.stock_quantity) {
        outOfStockItems.push(
          `${item.product_name}: requested ${item.quantity}, only ${item.stock_quantity} available`
        );
        continue;
      }

      // Calculate total
      totalAmount += parseFloat(item.price) * item.quantity;
    }

    // If there are invalid or out of stock items, throw error
    if (invalidItems.length > 0 || outOfStockItems.length > 0) {
      const errors = [...invalidItems, ...outOfStockItems];
      throw new Error(`Cannot create order: ${errors.join('; ')}`);
    }

    // Create order
    const order = await client.query(`
      INSERT INTO orders (user_id, status, total_amount, shipping_address, payment_intent_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, 'pending', totalAmount, shipping_address, payment_intent_id]);

    const orderId = order.rows[0].id;

    // Create order items and update stock
    for (const item of cartItems.rows) {
      // Create order item (save price at time of purchase)
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.product_id, item.quantity, item.price]);

      // Reduce stock quantity
      await client.query(`
        UPDATE products 
        SET stock_quantity = stock_quantity - $1, updated_at = NOW()
        WHERE id = $2
      `, [item.quantity, item.product_id]);

      await client.query(`
        INSERT INTO order_status_history (order_id, status, description)
        VALUES ($1, $2, $3)
      `, [orderId, 'pending', 'Order has been placed successfully.']);
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    // Get complete order with items
    const completeOrder = await getOrderById(orderId);

    return completeOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order from cart error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create "Buy Now" Order (Direct Purchase)
 * Does NOT clear the user's existing cart.
 */
export const createInstantOrder = async (userId, orderData) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const { 
      shipping_address, 
      payment_intent_id, 
      product_id, 
      quantity = 1 
    } = orderData;

    // 1. Fetch Product Details
    const productRes = await client.query(`
      SELECT id, name, price, stock_quantity, is_active 
      FROM products 
      WHERE id = $1
    `, [product_id]);

    if (productRes.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productRes.rows[0];

    // 2. Validate Product & Stock
    if (!product.is_active) {
      throw new Error(`Product "${product.name}" is no longer available`);
    }

    if (quantity > product.stock_quantity) {
      throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock_quantity} left.`);
    }

    // 3. Calculate Total
    const totalAmount = parseFloat(product.price) * quantity;

    // 4. Create Order
    const orderRes = await client.query(`
      INSERT INTO orders (
        user_id, 
        total_amount, 
        shipping_address, 
        payment_intent_id, 
        status
      )
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, created_at, status
    `, [userId, totalAmount, shipping_address, payment_intent_id]);

    const orderId = orderRes.rows[0].id;

    // 5. Create Order Item
    await client.query(`
      INSERT INTO order_items (
        order_id, 
        product_id, 
        quantity, 
        price_at_purchase
      )
      VALUES ($1, $2, $3, $4)
    `, [orderId, product.id, quantity, product.price]);

    // 6. Reduce Stock
    await client.query(`
      UPDATE products 
      SET stock_quantity = stock_quantity - $1, updated_at = NOW()
      WHERE id = $2
    `, [quantity, product.id]);

    // lOG THE pending status
    await client.query(`
      INSERT INTO order_status_history (order_id, status, description)
      VALUES ($1, $2, $3)
    `, [orderId, 'pending', 'Order has been placed successfully.']);

    // NOTE: We deliberately do NOT clear the cart here.

    await client.query('COMMIT');

    return {
      order_id: orderId,
      status: 'pending',
      total_amount: totalAmount,
      created_at: orderRes.rows[0].created_at,
      item_count: 1
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create instant order error:', error);
    throw error;
  } finally {
    client.release();
  }
};
/**
 * Get order by ID with all items
 */
export const getOrderById = async (orderId, userId = null, isAdmin = false) => {
  try {
    let orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const params = [orderId];

    // Non-admin users can only view their own orders
    if (!isAdmin && userId) {
      orderQuery += ' AND user_id = $2';
      params.push(userId);
    }

    const order = await db.query(orderQuery, params);

    if (order.rows.length === 0) {
      throw new Error('Order not found');
    }

    const orderData = order.rows[0];

    // Get order items with product details
    const items = await db.query(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.description as product_description,
        p.image_url,
        p.is_active as product_is_active,
        c.name as category_name,
        (oi.quantity * oi.price_at_purchase) as subtotal
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `, [orderId]);

    return {
      ...orderData,
      items: items.rows,
      item_count: items.rows.length,
      total_quantity: items.rows.reduce((sum, item) => sum + item.quantity, 0)
    };
  } catch (error) {
    console.error('Get order by ID error:', error);
    throw error;
  }
};

/**
 * Get all orders for a user
 */
export const getUserOrders = async (userId, options = {}) => {
  try {
    const {
      status,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = options;

    let query = `
      SELECT 
        o.*,
        COUNT(DISTINCT oi.id) as item_count,
        SUM(oi.quantity) as total_quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;

    // Filter by status
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    query += ` GROUP BY o.id`;

    // Sorting
    const validSorts = ['created_at', 'total_amount', 'status'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY o.${sortField} ${sortOrder}`;

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = $1';
    const countParams = [userId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);

    return {
      orders: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  } catch (error) {
    console.error('Get user orders error:', error);
    throw error;
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status, userId = null, isAdmin = false) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }

    // Get order
    let orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const params = [orderId];

    if (!isAdmin && userId) {
      orderQuery += ' AND user_id = $2';
      params.push(userId);
    }

    const order = await client.query(orderQuery, params);

    if (order.rows.length === 0) {
      throw new Error('Order not found');
    }

    const currentOrder = order.rows[0];
    const currentStatus = currentOrder.status;

    // Validate status transitions
    const validTransitions = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      throw new Error(`Cannot change status from ${currentStatus} to ${status}`);
    }

    // If cancelling or returning order, restore stock
    if ((status === 'cancelled' || status === 'returned') && 
        (currentStatus !== 'cancelled' && currentStatus !== 'returned')) {
      
      const orderItems = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of orderItems.rows) {
        await client.query(`
          UPDATE products 
          SET stock_quantity = stock_quantity + $1, updated_at = NOW()
          WHERE id = $2
        `, [item.quantity, item.product_id]);
      }
    }

    // Update order status
    const result = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    await client.query(`
      INSERT INTO order_status_history (order_id, status, description)
      VALUES ($1, $2, $3)
    `, [orderId, status, `Order status updated to ${status}`]);

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (orderId, userId, isAdmin = false) => {
  try {
    return await updateOrderStatus(orderId, 'cancelled', userId, isAdmin);
  } catch (error) {
    console.error('Cancel order error:', error);
    throw error;
  }
};

/**
 * Get order statistics for user
 */
export const getUserOrderStats = async (userId) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_orders,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM orders
      WHERE user_id = $1
    `, [userId]);

    const stats = result.rows[0];

    return {
      total_orders: parseInt(stats.total_orders),
      by_status: {
        pending: parseInt(stats.pending_orders),
        processing: parseInt(stats.processing_orders),
        shipped: parseInt(stats.shipped_orders),
        delivered: parseInt(stats.delivered_orders),
        cancelled: parseInt(stats.cancelled_orders),
        returned: parseInt(stats.returned_orders)
      },
      total_spent: parseFloat(stats.total_spent),
      average_order_value: parseFloat(stats.average_order_value),
      formatted_total_spent: formatPrice(parseFloat(stats.total_spent)),
      formatted_average_order: formatPrice(parseFloat(stats.average_order_value))
    };
  } catch (error) {
    console.error('Get user order stats error:', error);
    throw error;
  }
};

/**
 * Get all orders (Admin only)
 */
export const getAllOrders = async (filters = {}) => {
  try {
    const {
      status,
      user_id,
      start_date,
      end_date,
      min_amount,
      max_amount,
      limit = 50,
      offset = 0,
      sort = 'created_at',
      order = 'DESC'
    } = filters;

    let query = `
      SELECT 
        o.*,
        u.email as user_email,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (user_id) {
      paramCount++;
      query += ` AND o.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (min_amount) {
      paramCount++;
      query += ` AND o.total_amount >= $${paramCount}`;
      params.push(min_amount);
    }

    if (max_amount) {
      paramCount++;
      query += ` AND o.total_amount <= $${paramCount}`;
      params.push(max_amount);
    }

    query += ` GROUP BY o.id, u.email, u.first_name, u.last_name`;

    // Sorting
    const validSorts = ['created_at', 'total_amount', 'status'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY o.${sortField} ${sortOrder}`;

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    console.error('Get all orders error:', error);
    throw error;
  }
};

/**
 * Get order status history/timeline
 */
export const getOrderStatusHistory = async (orderId) => {
  try {
    const result = await db.query(
      `SELECT status, created_at, description 
       FROM order_status_history 
       WHERE order_id = $1 
       ORDER BY created_at ASC`,
      [orderId]
    );

    // This returns the ARRAY that your frontend .find() method expects
    return result.rows; 
  } catch (error) {
    console.error('Get order status history error:', error);
    throw error;
  }
};

/**
 * Check if user can review products from order
 */
export const canReviewOrderProducts = async (orderId, userId) => {
  try {
    const order = await db.query(
      'SELECT status, user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (order.rows.length === 0) {
      throw new Error('Order not found');
    }

    if (order.rows[0].user_id !== userId) {
      return false;
    }

    // Can only review delivered orders
    return order.rows[0].status === 'delivered';
  } catch (error) {
    console.error('Can review order products error:', error);
    throw error;
  }
};

/**
 * Get recent orders (for dashboard/homepage)
 */
export const getRecentOrders = async (userId, limit = 5) => {
  try {
    const result = await db.query(`
      SELECT 
        o.*,
        COUNT(DISTINCT oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  } catch (error) {
    console.error('Get recent orders error:', error);
    throw error;
  }
};

/**
 * Check each order status contain what products
 */

export const getOrderWithProducts = async (orderId, userId, isAdmin = false) => {
  try {
    let query = `
      SELECT 
        o.id AS order_id,
        o.status AS order_status,
        p.id AS product_id,
        p.name AS product_name,
        p.image_url AS product_image,
        oi.quantity
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1
    `;

    const params = [orderId];

    if (!isAdmin) {
      query += ` AND o.user_id = $2`;
      params.push(userId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      throw new Error("Order not found or access denied");
    }

    return result.rows;

  } catch (error) {
    console.error("Get order with products error:", error);
    throw error;
  }
};
/**
 * Format price helper
 */
const formatPrice = (price) => {
  return `$${parseFloat(price).toFixed(2)}`;
};
import db from "../../config/db.js";

/**
 * Get or create cart for user
 */
export const getOrCreateCart = async (userId) => {
  try {
    // Check if cart exists
    let cart = await db.query(
      'SELECT * FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cart.rows.length === 0) {
      // Create cart if it doesn't exist
      cart = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    return cart.rows[0];
  } catch (error) {
    console.error('Get or create cart error:', error);
    throw error;
  }
};

/**
 * Get user's cart with all items and product details
 */
export const getUserCart = async (userId) => {
  try {
    // Get or create cart
    const cart = await getOrCreateCart(userId);

    // Get cart items with product details
    const result = await db.query(`
      SELECT 
        ci.id as cart_item_id,
        ci.cart_id,
        ci.quantity,
        ci.created_at as added_at,
        ci.updated_at,
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.stock_quantity,
        p.image_url,
        p.is_active,
        c.name as category_name,
        c.slug as category_slug,
        (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at DESC
    `, [cart.id]);

    const items = result.rows;

    // Calculate totals
    const summary = calculateCartSummary(items);

    return {
      cart_id: cart.id,
      user_id: userId,
      items,
      summary,
      created_at: cart.created_at,
      updated_at: cart.updated_at
    };
  } catch (error) {
    console.error('Get user cart error:', error);
    throw error;
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (userId, productId, quantity = 1) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Validate quantity
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Get or create cart
    let cart = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cart.rows.length === 0) {
      cart = await client.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
    }

    const cartId = cart.rows[0].id;

    // Check if product exists and is active
    const product = await client.query(
      'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = $1',
      [productId]
    );

    if (product.rows.length === 0) {
      throw new Error('Product not found');
    }

    const productData = product.rows[0];

    if (!productData.is_active) {
      throw new Error('This product is no longer available');
    }

    // Check if item already exists in cart
    const existingItem = await client.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );

    let result;
    let newQuantity;

    if (existingItem.rows.length > 0) {
      // Update quantity
      newQuantity = existingItem.rows[0].quantity + quantity;
      
      // Check stock availability
      if (newQuantity > productData.stock_quantity) {
        throw new Error(`Only ${productData.stock_quantity} items available in stock`);
      }

      result = await client.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      // Check stock availability
      if (quantity > productData.stock_quantity) {
        throw new Error(`Only ${productData.stock_quantity} items available in stock`);
      }

      // Insert new item
      result = await client.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
        [cartId, productId, quantity]
      );
    }

    await client.query('COMMIT');

    return {
      cart_item: result.rows[0],
      product: productData,
      action: existingItem.rows.length > 0 ? 'updated' : 'added'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add to cart error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Validate quantity
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Get cart item with product details
    const item = await client.query(`
      SELECT 
        ci.*,
        p.stock_quantity,
        p.is_active,
        c.user_id
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = $1
    `, [cartItemId]);

    if (item.rows.length === 0) {
      throw new Error('Cart item not found');
    }

    const cartItem = item.rows[0];

    // Verify ownership
    if (cartItem.user_id !== userId) {
      throw new Error('You can only update items in your own cart');
    }

    // Check if product is still active
    if (!cartItem.is_active) {
      throw new Error('This product is no longer available');
    }

    // Check stock availability
    if (quantity > cartItem.stock_quantity) {
      throw new Error(`Only ${cartItem.stock_quantity} items available in stock`);
    }

    // Update quantity
    const result = await client.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [quantity, cartItemId]
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update cart item quantity error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (userId, cartItemId) => {
  try {
    // Verify ownership and get item
    const item = await db.query(`
      SELECT ci.*, c.user_id
      FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = $1
    `, [cartItemId]);

    if (item.rows.length === 0) {
      throw new Error('Cart item not found');
    }

    if (item.rows[0].user_id !== userId) {
      throw new Error('You can only remove items from your own cart');
    }

    // Delete item
    const result = await db.query(
      'DELETE FROM cart_items WHERE id = $1 RETURNING *',
      [cartItemId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Remove from cart error:', error);
    throw error;
  }
};

/**
 * Clear entire cart
 */
export const clearCart = async (userId) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Get cart
    const cart = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cart.rows.length === 0) {
      throw new Error('Cart not found');
    }

    const cartId = cart.rows[0].id;

    // Delete all items
    const result = await client.query(
      'DELETE FROM cart_items WHERE cart_id = $1 RETURNING *',
      [cartId]
    );

    await client.query('COMMIT');

    return {
      deleted_count: result.rows.length,
      items: result.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clear cart error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get cart summary (item count, total)
 */
export const getCartSummary = async (userId) => {
  try {
    const cart = await getOrCreateCart(userId);

    const result = await db.query(`
      SELECT 
        COUNT(ci.id) as item_count,
        SUM(ci.quantity) as total_quantity,
        SUM(ci.quantity * p.price) as total_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1 AND p.is_active = true
    `, [cart.id]);

    const summary = result.rows[0];

    return {
      cart_id: cart.id,
      item_count: parseInt(summary.item_count) || 0,
      total_quantity: parseInt(summary.total_quantity) || 0,
      total_price: parseFloat(summary.total_price) || 0,
      formatted_total: formatPrice(parseFloat(summary.total_price) || 0)
    };
  } catch (error) {
    console.error('Get cart summary error:', error);
    throw error;
  }
};

/**
 * Validate cart before checkout
 */
export const validateCart = async (userId) => {
  try {
    const cartData = await getUserCart(userId);
    const errors = [];
    const warnings = [];

    if (cartData.items.length === 0) {
      errors.push('Cart is empty');
    }

    cartData.items.forEach(item => {
      // Check if product is still active
      if (!item.is_active) {
        errors.push(`Product "${item.product_name}" is no longer available`);
      }

      // Check stock availability
      if (item.quantity > item.stock_quantity) {
        if (item.stock_quantity === 0) {
          errors.push(`Product "${item.product_name}" is out of stock`);
        } else {
          warnings.push(`Only ${item.stock_quantity} of "${item.product_name}" available (you have ${item.quantity} in cart)`);
        }
      }

      // Check if quantity is valid
      if (item.quantity < 1) {
        errors.push(`Invalid quantity for "${item.product_name}"`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      cart: cartData
    };
  } catch (error) {
    console.error('Validate cart error:', error);
    throw error;
  }
};

/**
 * Check if product is in cart
 */
export const isProductInCart = async (userId, productId) => {
  try {
    const cart = await getOrCreateCart(userId);

    const result = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );

    if (result.rows.length === 0) {
      return { in_cart: false, quantity: 0 };
    }

    return {
      in_cart: true,
      quantity: result.rows[0].quantity,
      cart_item_id: result.rows[0].id
    };
  } catch (error) {
    console.error('Check product in cart error:', error);
    throw error;
  }
};

/**
 * Get cart item count
 */
export const getCartItemCount = async (userId) => {
  try {
    const cart = await getOrCreateCart(userId);

    const result = await db.query(
      'SELECT COUNT(*) as count FROM cart_items WHERE cart_id = $1',
      [cart.id]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Get cart item count error:', error);
    throw error;
  }
};

/**
 * Update multiple cart items at once
 */
export const updateCartItems = async (userId, updates) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const cart = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cart.rows.length === 0) {
      throw new Error('Cart not found');
    }

    const results = [];

    for (const update of updates) {
      const { cart_item_id, quantity } = update;

      // Validate quantity
      if (quantity < 1) {
        continue; // Skip invalid quantities
      }

      // Get item with product details
      const item = await client.query(`
        SELECT ci.*, p.stock_quantity, p.is_active
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.id = $1 AND ci.cart_id = $2
      `, [cart_item_id, cart.rows[0].id]);

      if (item.rows.length === 0) {
        continue; // Skip non-existent items
      }

      const itemData = item.rows[0];

      // Check if product is active and has enough stock
      if (!itemData.is_active || quantity > itemData.stock_quantity) {
        continue; // Skip invalid items
      }

      // Update quantity
      const result = await client.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [quantity, cart_item_id]
      );

      results.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return {
      updated_count: results.length,
      items: results
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update cart items error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate cart summary from items
 */
const calculateCartSummary = (items) => {
  const activeItems = items.filter(item => item.is_active);
  
  const itemCount = activeItems.length;
  const totalQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = activeItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  
  const inactiveItems = items.filter(item => !item.is_active);
  const outOfStockItems = activeItems.filter(item => item.quantity > item.stock_quantity);

  return {
    item_count: itemCount,
    total_quantity: totalQuantity,
    total_price: totalPrice,
    formatted_total: formatPrice(totalPrice),
    has_inactive_items: inactiveItems.length > 0,
    inactive_item_count: inactiveItems.length,
    has_stock_issues: outOfStockItems.length > 0,
    stock_issue_count: outOfStockItems.length
  };
};

/**
 * Format price helper
 */
const formatPrice = (price) => {
  return `$${parseFloat(price).toFixed(2)}`;
};
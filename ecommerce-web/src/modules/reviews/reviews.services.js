import db from "../../config/db.js";

/**
 * Get all reviews for a product
 */
export const getProductReviews = async (productId, options = {}) => {
  try {
    const {
      sort = 'created_at',
      order = 'DESC',
      limit = 50,
      offset = 0,
      min_rating,
      max_rating
    } = options;

    let query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1
    `;
    
    const params = [productId];
    let paramCount = 1;

    // Filter by rating range
    if (min_rating) {
      paramCount++;
      query += ` AND r.rating >= $${paramCount}`;
      params.push(min_rating);
    }

    if (max_rating) {
      paramCount++;
      query += ` AND r.rating <= $${paramCount}`;
      params.push(max_rating);
    }

    // Sorting
    const validSorts = ['created_at', 'rating'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY r.${sortField} ${sortOrder}`;

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = $1',
      [productId]
    );

    // Get rating distribution
    const distributionResult = await db.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM reviews
      WHERE product_id = $1
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);

    const distribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    distributionResult.rows.forEach(row => {
      distribution[row.rating] = parseInt(row.count);
    });

    return {
      reviews: result.rows.map(review => ({
        ...review,
        user_name: `${review.first_name} ${review.last_name}`,
        // Hide full email for privacy
        user_email: review.email ? review.email.replace(/(.{2})(.*)(?=@)/, '$1***') : null
      })),
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.rows[0].total / limit)
      },
      distribution
    };
  } catch (error) {
    console.error('Get product reviews error:', error);
    throw error;
  }
};

/**
 * Get review by ID
 */
export const getReviewById = async (reviewId) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        p.name as product_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.id = $1
    `, [reviewId]);

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    const review = result.rows[0];
    
    return {
      ...review,
      user_name: `${review.first_name} ${review.last_name}`,
      user_email: review.email ? review.email.replace(/(.{2})(.*)(?=@)/, '$1***') : null
    };
  } catch (error) {
    console.error('Get review by ID error:', error);
    throw error;
  }
};

/**
 * Get all reviews by a user
 */
export const getUserReviews = async (userId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;

    const result = await db.query(`
      SELECT 
        r.*,
        p.name as product_name,
        p.image_url as product_image,
        p.is_active as product_active
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = $1',
      [userId]
    );

    return {
      reviews: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  } catch (error) {
    console.error('Get user reviews error:', error);
    throw error;
  }
};

/**
 * Create a review
 */
export const createReview = async (reviewData, userId) => {
  try {
    const { product_id, rating, comment } = reviewData;

    // Validate required fields
    if (!product_id || !rating) {
      throw new Error('Product ID and rating are required');
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if product exists
    const productExists = await db.query(
      'SELECT id, is_active FROM products WHERE id = $1',
      [product_id]
    );

    if (productExists.rows.length === 0) {
      throw new Error('Product not found');
    }

    if (!productExists.rows[0].is_active) {
      throw new Error('Cannot review an inactive product');
    }

    // Check if user already reviewed this product
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    if (existingReview.rows.length > 0) {
      throw new Error('You have already reviewed this product. Please update your existing review instead.');
    }

    // Optional: Check if user purchased the product
    const hasPurchased = await db.query(`
      SELECT 1 FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
      LIMIT 1
    `, [userId, product_id]);

    if (hasPurchased.rows.length === 0) {
      throw new Error('You can only review products you have purchased');
    }

    // Create review
    const result = await db.query(`
      INSERT INTO reviews (user_id, product_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, product_id, rating, comment]);

    return result.rows[0];
  } catch (error) {
    console.error('Create review error:', error);
    throw error;
  }
};

/**
 * Update a review
 */
export const updateReview = async (reviewId, reviewData, userId, isAdmin = false) => {
  try {
    const { rating, comment } = reviewData;

    // Check if review exists
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (existingReview.rows.length === 0) {
      throw new Error('Review not found');
    }

    // Check ownership (unless admin)
    if (!isAdmin && existingReview.rows[0].user_id !== userId) {
      throw new Error('You can only update your own reviews');
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (rating !== undefined) {
      paramCount++;
      updates.push(`rating = $${paramCount}`);
      values.push(rating);
    }

    if (comment !== undefined) {
      paramCount++;
      updates.push(`comment = $${paramCount}`);
      values.push(comment);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(reviewId);

    const query = `
      UPDATE reviews 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Update review error:', error);
    throw error;
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId, userId, isAdmin = false) => {
  try {
    // Check if review exists
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (existingReview.rows.length === 0) {
      throw new Error('Review not found');
    }

    // Check ownership (unless admin)
    if (!isAdmin && existingReview.rows[0].user_id !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    const result = await db.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING *',
      [reviewId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Delete review error:', error);
    throw error;
  }
};

/**
 * Get product rating statistics
 */
export const getProductRatingStats = async (productId) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE product_id = $1
    `, [productId]);

    const stats = result.rows[0];
    const total = parseInt(stats.total_reviews);

    return {
      total_reviews: total,
      average_rating: parseFloat(stats.average_rating).toFixed(2),
      distribution: {
        5: {
          count: parseInt(stats.five_star),
          percentage: total > 0 ? ((stats.five_star / total) * 100).toFixed(1) : 0
        },
        4: {
          count: parseInt(stats.four_star),
          percentage: total > 0 ? ((stats.four_star / total) * 100).toFixed(1) : 0
        },
        3: {
          count: parseInt(stats.three_star),
          percentage: total > 0 ? ((stats.three_star / total) * 100).toFixed(1) : 0
        },
        2: {
          count: parseInt(stats.two_star),
          percentage: total > 0 ? ((stats.two_star / total) * 100).toFixed(1) : 0
        },
        1: {
          count: parseInt(stats.one_star),
          percentage: total > 0 ? ((stats.one_star / total) * 100).toFixed(1) : 0
        }
      }
    };
  } catch (error) {
    console.error('Get product rating stats error:', error);
    throw error;
  }
};

/**
 * Check if user has reviewed a product
 */
export const hasUserReviewedProduct = async (userId, productId) => {
  try {
    const result = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Check user reviewed product error:', error);
    throw error;
  }
};

/**
 * Get user's review for a specific product
 */
export const getUserProductReview = async (userId, productId) => {
  try {
    const result = await db.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get user product review error:', error);
    throw error;
  }
};

/**
 * Get most helpful/recent reviews (for homepage/featured)
 */
export const getFeaturedReviews = async (limit = 10) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        p.name as product_name,
        p.image_url as product_image,
        p.id as product_id
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE p.is_active = true
        AND r.rating >= 4
        AND r.comment IS NOT NULL
        AND LENGTH(r.comment) > 50
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(review => ({
      ...review,
      user_name: `${review.first_name} ${review.last_name}`
    }));
  } catch (error) {
    console.error('Get featured reviews error:', error);
    throw error;
  }
};

/**
 * Admin: Get all reviews with filters
 */
export const getAllReviews = async (filters = {}) => {
  try {
    const {
      min_rating,
      max_rating,
      has_comment,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        p.name as product_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (min_rating) {
      paramCount++;
      query += ` AND r.rating >= $${paramCount}`;
      params.push(min_rating);
    }

    if (max_rating) {
      paramCount++;
      query += ` AND r.rating <= $${paramCount}`;
      params.push(max_rating);
    }

    if (has_comment !== undefined) {
      if (has_comment) {
        query += ` AND r.comment IS NOT NULL AND r.comment != ''`;
      } else {
        query += ` AND (r.comment IS NULL OR r.comment = '')`;
      }
    }

    query += ` ORDER BY r.created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    console.error('Get all reviews error:', error);
    throw error;
  }
};
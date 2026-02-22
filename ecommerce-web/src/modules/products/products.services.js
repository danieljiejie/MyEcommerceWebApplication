import db from "../../config/db.js";
import axios from "axios"
import { generateSlug } from "../categories/categories.services.js";

const PRODUCTS_URL = "https://kolzsticks.github.io/Free-Ecommerce-Products-Api/main/products.json";

export const syncApiProducts = async () => {
  try {
    const response = await axios.get(PRODUCTS_URL);
    const apiProducts = response.data;

    for (const item of apiProducts) {
      // --- 1. HANDLE CATEGORY ---
      let categoryResult = await db.query(
        'SELECT id FROM categories WHERE name = $1',
        [item.category]
      );

      let categoryId;

      if (categoryResult.rows.length === 0) {
        // Create it if it doesn't exist
        const slug = generateSlug(item.category);
        const newCat = await db.query(
          'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
          [item.category, slug]
        );
        categoryId = newCat.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }

      // --- 2. HANDLE PRODUCT ---
      // Convert priceCents (4000) to standard price (40.00)
      const formattedPrice = item.priceCents / 100;

      // Check if product exists to avoid duplicates
      const existingProduct = await db.query(
        'SELECT id FROM products WHERE api_reference_id = $1',
        [item.id.toString()]
      );

      if (existingProduct.rows.length === 0) {
        await db.query(`
          INSERT INTO products (
            category_id,
            api_reference_id,
            name,
            description,
            price,
            image_url,
            stock_quantity,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            categoryId,
            item.id.toString(),
            item.name,
            item.description,
            formattedPrice,
            item.image,
            100, // Default stock
            true
          ]
        );
      }
    }
    return { success: true, message: "Categories and Products synced!" };
  } catch (error) {
    console.error("Sync Error:", error);
    throw error;
  }
};

/**
 * Get all products with optional filters
 */
export const getAllProducts = async (filters = {}) => {
  try {
    const {
      category_id,
      is_active = true,
      min_price,
      max_price,
      search,
      sort = 'created_at',
      order = 'DESC',
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Filter by active status
    if (is_active !== undefined) {
      paramCount++;
      query += ` AND p.is_active = $${paramCount}`;
      params.push(is_active);
    }

    // Filter by category
    if (category_id) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
    }

    // Filter by price range
    if (min_price) {
      paramCount++;
      query += ` AND p.price >= $${paramCount}`;
      params.push(min_price);
    }

    if (max_price) {
      paramCount++;
      query += ` AND p.price <= $${paramCount}`;
      params.push(max_price);
    }

    // Search by name or description
    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.id, c.name, c.slug`;

    // Sorting
    const validSorts = ['created_at', 'price', 'name', 'stock_quantity'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    query += ` ORDER BY p.${sortField} ${sortOrder}`;

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;

    if (is_active !== undefined) {
      countParamCount++;
      countQuery += ` AND p.is_active = $${countParamCount}`;
      countParams.push(is_active);
    }

    if (category_id) {
      countParamCount++;
      countQuery += ` AND p.category_id = $${countParamCount}`;
      countParams.push(category_id);
    }

    if (min_price) {
      countParamCount++;
      countQuery += ` AND p.price >= $${countParamCount}`;
      countParams.push(min_price);
    }

    if (max_price) {
      countParamCount++;
      countQuery += ` AND p.price <= $${countParamCount}`;
      countParams.push(max_price);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (p.name ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      products: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Get all products error:', error);
    throw error;
  }
};

/**
 * Get product by ID with full details
 */
export const getProductById = async (productId) => {
  try {
    const result = await db.query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.slug
    `, [productId]);

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get product by ID error:', error);
    throw error;
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = async (searchQuery, limit = 50) => {
  try {
    if (!searchQuery || searchQuery.trim() === '') {
      throw new Error('Search query is required');
    }

    const result = await db.query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        -- Relevance scoring
        CASE 
          WHEN p.name ILIKE $1 THEN 3
          WHEN p.name ILIKE $2 THEN 2
          WHEN p.description ILIKE $2 THEN 1
          ELSE 0
        END as relevance
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.is_active = true
        AND (p.name ILIKE $2 OR p.description ILIKE $2)
      GROUP BY p.id, c.name, c.slug
      ORDER BY relevance DESC, p.name ASC
      LIMIT $3
    `, [searchQuery, `%${searchQuery}%`, limit]);

    return result.rows;
  } catch (error) {
    console.error('Search products error:', error);
    throw error;
  }
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (categoryId, limit = 50, offset = 0) => {
  try {
    const result = await db.query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.category_id = $1 AND p.is_active = true
      GROUP BY p.id, c.name, c.slug
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [categoryId, limit, offset]);

    return result.rows;
  } catch (error) {
    console.error('Get products by category error:', error);
    throw error;
  }
};

/**
 * Create new product (Admin only)
 */
export const createProduct = async (productData) => {
  try {
    const {
      category_id,
      api_reference_id,
      name,
      description,
      price,
      stock_quantity = 0,
      image_url,
      is_active = true
    } = productData;

    // Validate required fields
    if (!name || !price) {
      throw new Error('Product name and price are required');
    }

    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (stock_quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    // Check if category exists
    if (category_id) {
      const categoryExists = await db.query(
        'SELECT id FROM categories WHERE id = $1',
        [category_id]
      );

      if (categoryExists.rows.length === 0) {
        throw new Error('Category not found');
      }
    }

    const result = await db.query(`
      INSERT INTO products (
        category_id,
        api_reference_id,
        name,
        description,
        price,
        stock_quantity,
        image_url,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      category_id,
      api_reference_id,
      name,
      description,
      price,
      stock_quantity,
      image_url,
      is_active
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Create product error:', error);
    throw error;
  }
};

/**
 * Update product (Admin only)
 */
export const updateProduct = async (productId, productData) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      stock_quantity,
      image_url,
      is_active
    } = productData;

    // Check if product exists
    const existingProduct = await db.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (existingProduct.rows.length === 0) {
      throw new Error('Product not found');
    }

    // Validate price and stock
    if (price !== undefined && price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (stock_quantity !== undefined && stock_quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    // Check if category exists
    if (category_id) {
      const categoryExists = await db.query(
        'SELECT id FROM categories WHERE id = $1',
        [category_id]
      );

      if (categoryExists.rows.length === 0) {
        throw new Error('Category not found');
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (category_id !== undefined) {
      paramCount++;
      updates.push(`category_id = $${paramCount}`);
      values.push(category_id);
    }

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (price !== undefined) {
      paramCount++;
      updates.push(`price = $${paramCount}`);
      values.push(price);
    }

    if (stock_quantity !== undefined) {
      paramCount++;
      updates.push(`stock_quantity = $${paramCount}`);
      values.push(stock_quantity);
    }

    if (image_url !== undefined) {
      paramCount++;
      updates.push(`image_url = $${paramCount}`);
      values.push(image_url);
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(productId);

    const query = `
      UPDATE products 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Update product error:', error);
    throw error;
  }
};

/**
 * Delete product (soft delete - set is_active to false)
 */
export const deleteProduct = async (productId) => {
  try {
    const result = await db.query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [productId]
    );

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Delete product error:', error);
    throw error;
  }
};

/**
 * Hard delete product (Admin only - permanent deletion)
 */
export const hardDeleteProduct = async (productId) => {
  try {
    const result = await db.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [productId]
    );

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Hard delete product error:', error);
    throw error;
  }
};

/**
 * Update product stock quantity
 */
export const updateProductStock = async (productId, quantity, operation = 'set') => {
  try {
    let query;
    
    if (operation === 'increment') {
      query = `
        UPDATE products 
        SET stock_quantity = stock_quantity + $1, updated_at = NOW()
        WHERE id = $2 
        RETURNING *
      `;
    } else if (operation === 'decrement') {
      query = `
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = NOW()
        WHERE id = $2 
        RETURNING *
      `;
    } else {
      // Set absolute value
      query = `
        UPDATE products 
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2 
        RETURNING *
      `;
    }

    const result = await db.query(query, [quantity, productId]);

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Update product stock error:', error);
    throw error;
  }
};
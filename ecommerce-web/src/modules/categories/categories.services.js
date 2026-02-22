import db from "../../config/db.js";


/**
 * Get all categories
 */
export const getAllCategories = async () => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return result.rows;
  } catch (error) {
    console.error('Get all categories error:', error);
    throw error;
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (categoryId) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `, [categoryId]);

    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get category by ID error:', error);
    throw error;
  }
};

/**
 * Get category by slug
 */
export const getCategoryBySlug = async (slug) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.slug = $1
      GROUP BY c.id
    `, [slug]);

    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get category by slug error:', error);
    throw error;
  }
};

/**
 * Create new category (Admin only)
 */
export const createCategory = async (categoryData) => {
  try {
    const { name, slug, description } = categoryData;

    // Validate required fields
    if (!name || !slug) {
      throw new Error('Category name and slug are required');
    }

    // Check if category with same name or slug exists
    const existingCategory = await db.query(
      'SELECT id FROM categories WHERE name = $1 OR slug = $2',
      [name, slug]
    );

    if (existingCategory.rows.length > 0) {
      throw new Error('Category with this name or slug already exists');
    }

    // Validate slug format (lowercase, hyphens, no spaces)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      throw new Error('Slug must be lowercase letters, numbers, and hyphens only');
    }

    const result = await db.query(`
      INSERT INTO categories (name, slug, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, slug, description]);

    return result.rows[0];
  } catch (error) {
    console.error('Create category error:', error);
    throw error;
  }
};

/**
 * Update category (Admin only)
 */
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const { name, slug, description } = categoryData;

    // Check if category exists
    const existingCategory = await db.query(
      'SELECT * FROM categories WHERE id = $1',
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      throw new Error('Category not found');
    }

    // Check for duplicate name/slug (excluding current category)
    if (name || slug) {
      const duplicateCheck = await db.query(
        'SELECT id FROM categories WHERE (name = $1 OR slug = $2) AND id != $3',
        [name || existingCategory.rows[0].name, slug || existingCategory.rows[0].slug, categoryId]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error('Category with this name or slug already exists');
      }
    }

    // Validate slug format if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        throw new Error('Slug must be lowercase letters, numbers, and hyphens only');
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (slug !== undefined) {
      paramCount++;
      updates.push(`slug = $${paramCount}`);
      values.push(slug);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(categoryId);

    const query = `
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Update category error:', error);
    throw error;
  }
};

/**
 * Delete category (Admin only)
 */
export const deleteCategory = async (categoryId) => {
  try {
    // Check if category has products
    const productsCount = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [categoryId]
    );

    if (parseInt(productsCount.rows[0].count) > 0) {
      throw new Error('Cannot delete category with existing products. Remove or reassign products first.');
    }

    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [categoryId]
    );

    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Delete category error:', error);
    throw error;
  }
};

/**
 * Generate slug from name
 */
export const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
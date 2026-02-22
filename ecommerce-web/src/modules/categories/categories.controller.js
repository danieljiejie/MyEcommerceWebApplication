import {
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    generateSlug
  } from "./categories.services.js";
  
  /**
   * GET /api/categories
   * Get all categories
   */
  export const getCategoriesControl = async (req, res) => {
    try {
      const categories = await getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get categories controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/categories/:id
   * Get category by ID
   */
  export const getCategoryByIdControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const category = await getCategoryById(id);
      res.json(category);
    } catch (error) {
      console.error('Get category by ID controller error:', error);
      
      if (error.message === 'Category not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/categories/slug/:slug
   * Get category by slug
   */
  export const getCategoryBySlugControl = async (req, res) => {
    try {
      const { slug } = req.params;
  
      const category = await getCategoryBySlug(slug);
      res.json(category);
    } catch (error) {
      console.error('Get category by slug controller error:', error);
      
      if (error.message === 'Category not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * POST /api/categories (Admin only)
   * Create new category
   */
  export const createCategoryControl = async (req, res) => {
    try {
      let { name, slug, description } = req.body;
  
      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }
  
      // Auto-generate slug if not provided
      if (!slug) {
        slug = generateSlug(name);
      }
  
      const category = await createCategory({ name, slug, description });
      res.status(201).json(category);
    } catch (error) {
      console.error('Create category controller error:', error);
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * PUT /api/categories/:id (Admin only)
   * Update category
   */
  export const updateCategoryControl = async (req, res) => {
    try {
      const { id } = req.params;
      const categoryData = req.body;
  
      const category = await updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error('Update category controller error:', error);
      
      if (error.message === 'Category not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * DELETE /api/categories/:id (Admin only)
   * Delete category
   */
  export const deleteCategoryControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const category = await deleteCategory(id);
      res.json({ 
        message: 'Category deleted successfully',
        category 
      });
    } catch (error) {
      console.error('Delete category controller error:', error);
      
      if (error.message === 'Category not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message });
    }
  };
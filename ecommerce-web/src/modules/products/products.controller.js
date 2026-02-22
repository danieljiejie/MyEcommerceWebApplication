import {
    getAllProducts,
    getProductById,
    searchProducts,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    hardDeleteProduct,
    updateProductStock
  } from "./products.services.js";
  
  /**
   * GET /api/products
   * Get all products with optional filters
   */
  export const getProductsControl = async (req, res) => {
    try {
      const filters = {
        category_id: req.query.category_id,
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : true,
        min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
        max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
        search: req.query.search,
        sort: req.query.sort || 'created_at',
        order: req.query.order || 'DESC',
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
  
      const result = await getAllProducts(filters);
      res.json(result);
    } catch (error) {
      console.error('Get products controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/products/:id
   * Get single product by ID
   */
  export const getProductByIdControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const product = await getProductById(id);
      res.json(product);
    } catch (error) {
      console.error('Get product by ID controller error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/products/search?q=query
   * Search products by name or description
   */
  export const searchProductsControl = async (req, res) => {
    try {
      const { q } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  
      if (!q || q.trim() === '') {
        return res.status(400).json({ message: 'Search query is required' });
      }
  
      const products = await searchProducts(q, limit);
      res.json(products);
    } catch (error) {
      console.error('Search products controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/products/category/:categoryId
   * Get products by category
   */
  export const getProductsByCategoryControl = async (req, res) => {
    try {
      const { categoryId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
      const products = await getProductsByCategory(categoryId, limit, offset);
      res.json(products);
    } catch (error) {
      console.error('Get products by category controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * POST /api/products (Admin only)
   * Create new product
   */
  export const createProductControl = async (req, res) => {
    try {
      const productData = req.body;
  
      const product = await createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error('Create product controller error:', error);
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * PUT /api/products/:id (Admin only)
   * Update product
   */
  export const updateProductControl = async (req, res) => {
    try {
      const { id } = req.params;
      const productData = req.body;
  
      const product = await updateProduct(id, productData);
      res.json(product);
    } catch (error) {
      console.error('Update product controller error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * DELETE /api/products/:id (Admin only)
   * Soft delete product (set is_active to false)
   */
  export const deleteProductControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const product = await deleteProduct(id);
      res.json({ 
        message: 'Product deactivated successfully',
        product 
      });
    } catch (error) {
      console.error('Delete product controller error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * DELETE /api/products/:id/hard (Admin only)
   * Permanently delete product
   */
  export const hardDeleteProductControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const product = await hardDeleteProduct(id);
      res.json({ 
        message: 'Product permanently deleted',
        product 
      });
    } catch (error) {
      console.error('Hard delete product controller error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * PATCH /api/products/:id/stock (Admin only)
   * Update product stock quantity
   */
  export const updateProductStockControl = async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body;
  
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ message: 'Valid quantity is required' });
      }
  
      if (!['set', 'increment', 'decrement'].includes(operation)) {
        return res.status(400).json({ 
          message: 'Operation must be "set", "increment", or "decrement"' 
        });
      }
  
      const product = await updateProductStock(id, quantity, operation);
      res.json(product);
    } catch (error) {
      console.error('Update product stock controller error:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
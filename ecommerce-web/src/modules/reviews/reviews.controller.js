import {
    getProductReviews,
    getReviewById,
    getUserReviews,
    createReview,
    updateReview,
    deleteReview,
    getProductRatingStats,
    hasUserReviewedProduct,
    getUserProductReview,
    getFeaturedReviews,
    getAllReviews
  } from "./reviews.services.js";
  
  /**
   * GET /api/products/:productId/reviews
   * Get all reviews for a specific product
   */
  export const getProductReviewsControl = async (req, res) => {
    try {
      const { productId } = req.params;
      
      const options = {
        sort: req.query.sort || 'created_at',
        order: req.query.order || 'DESC',
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
        min_rating: req.query.min_rating ? parseInt(req.query.min_rating) : undefined,
        max_rating: req.query.max_rating ? parseInt(req.query.max_rating) : undefined
      };
  
      const result = await getProductReviews(productId, options);
      res.json(result);
    } catch (error) {
      console.error('Get product reviews controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/reviews/:id
   * Get single review by ID
   */
  export const getReviewByIdControl = async (req, res) => {
    try {
      const { id } = req.params;
  
      const review = await getReviewById(id);
      res.json(review);
    } catch (error) {
      console.error('Get review by ID controller error:', error);
      
      if (error.message === 'Review not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/users/:userId/reviews
   * Get all reviews by a specific user
   */
  export const getUserReviewsControl = async (req, res) => {
    try {
      const { userId } = req.params;
      
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
  
      const result = await getUserReviews(userId, options);
      res.json(result);
    } catch (error) {
      console.error('Get user reviews controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/auth/me/reviews
   * Get current user's reviews
   */
  export const getMyReviewsControl = async (req, res) => {
    try {
      const userId = req.user.id; // From auth middleware
      
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
  
      const result = await getUserReviews(userId, options);
      res.json(result);
    } catch (error) {
      console.error('Get my reviews controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * POST /api/products/:productId/reviews
   * Create a review for a product (authenticated users only)
   */
  export const createReviewControl = async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user.id; // From auth middleware
      const { rating, comment } = req.body;
  
      // Validation
      if (!rating) {
        return res.status(400).json({ message: 'Rating is required' });
      }
  
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
  
      const reviewData = {
        product_id: productId,
        rating: parseInt(rating),
        comment: comment || null
      };
  
      const review = await createReview(reviewData, userId);
      res.status(201).json(review);
    } catch (error) {
      console.error('Create review controller error:', error);
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * PUT /api/reviews/:id
   * Update a review (only by the user who created it, or admin)
   */
  export const updateReviewControl = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.is_admin || false;
      const { rating, comment } = req.body;
  
      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
  
      const reviewData = {
        rating: rating !== undefined ? parseInt(rating) : undefined,
        comment
      };
  
      const review = await updateReview(id, reviewData, userId, isAdmin);
      res.json(review);
    } catch (error) {
      console.error('Update review controller error:', error);
      
      if (error.message === 'Review not found') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'You can only update your own reviews') {
        return res.status(403).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * DELETE /api/reviews/:id
   * Delete a review (only by the user who created it, or admin)
   */
  export const deleteReviewControl = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.is_admin || false;
  
      const review = await deleteReview(id, userId, isAdmin);
      res.json({ 
        message: 'Review deleted successfully',
        review 
      });
    } catch (error) {
      console.error('Delete review controller error:', error);
      
      if (error.message === 'Review not found') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'You can only delete your own reviews') {
        return res.status(403).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/products/:productId/reviews/stats
   * Get rating statistics for a product
   */
  export const getProductRatingStatsControl = async (req, res) => {
    try {
      const { productId } = req.params;
  
      const stats = await getProductRatingStats(productId);
      res.json(stats);
    } catch (error) {
      console.error('Get product rating stats controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/products/:productId/reviews/check
   * Check if current user has reviewed a product (authenticated)
   */
  export const checkUserReviewedControl = async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user.id;
  
      const hasReviewed = await hasUserReviewedProduct(userId, productId);
      
      if (hasReviewed) {
        const review = await getUserProductReview(userId, productId);
        return res.json({ 
          has_reviewed: true,
          review
        });
      }
  
      res.json({ 
        has_reviewed: false,
        review: null
      });
    } catch (error) {
      console.error('Check user reviewed controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/reviews/featured
   * Get featured reviews for homepage/showcase
   */
  export const getFeaturedReviewsControl = async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  
      const reviews = await getFeaturedReviews(limit);
      res.json(reviews);
    } catch (error) {
      console.error('Get featured reviews controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/admin/reviews
   * Get all reviews (Admin only)
   */
  export const getAllReviewsControl = async (req, res) => {
    try {
      const filters = {
        min_rating: req.query.min_rating ? parseInt(req.query.min_rating) : undefined,
        max_rating: req.query.max_rating ? parseInt(req.query.max_rating) : undefined,
        has_comment: req.query.has_comment !== undefined ? req.query.has_comment === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
  
      const reviews = await getAllReviews(filters);
      res.json(reviews);
    } catch (error) {
      console.error('Get all reviews controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
import {
    getUserAddresses,
    getAddressById,
    getDefaultAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    formatAddress,
    formatShippingLabel,
    validateAddress,
    userHasAddresses,
    getAddressCount
  } from "./addresses.services.js";
  
  /**
   * GET /api/users/:userId/addresses
   * Get all addresses for a user
   */
  export const getUserAddressesControl = async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only view their own addresses (unless admin)
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only view your own addresses' 
        });
      }
  
      const addresses = await getUserAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error('Get user addresses controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/users/:userId/addresses/:addressId
   * Get single address by ID
   */
  export const getAddressByIdControl = async (req, res) => {
    try {
      const { userId, addressId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only view their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only view your own addresses' 
        });
      }
  
      const address = await getAddressById(addressId, userId, isAdmin);
      res.json(address);
    } catch (error) {
      console.error('Get address by ID controller error:', error);
      
      if (error.message === 'Address not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/users/:userId/addresses/default
   * Get user's default address
   */
  export const getDefaultAddressControl = async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only view their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only view your own addresses' 
        });
      }
  
      const address = await getDefaultAddress(userId);
      
      if (!address) {
        return res.status(404).json({ 
          message: 'No addresses found for this user' 
        });
      }
  
      res.json(address);
    } catch (error) {
      console.error('Get default address controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * POST /api/users/:userId/addresses
   * Create new address
   */
  export const createAddressControl = async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only create addresses for themselves
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only create addresses for yourself' 
        });
      }
  
      const addressData = req.body;
  
      // Validate address data
      const validation = validateAddress(addressData);
      if (!validation.valid) {
        return res.status(400).json({ 
          message: validation.message,
          missing: validation.missing 
        });
      }
  
      const address = await createAddress(addressData, userId);
      res.status(201).json(address);
    } catch (error) {
      console.error('Create address controller error:', error);
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * PUT /api/users/:userId/addresses/:addressId
   * Update address
   */
  export const updateAddressControl = async (req, res) => {
    try {
      const { userId, addressId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only update their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only update your own addresses' 
        });
      }
  
      const addressData = req.body;
  
      const address = await updateAddress(addressId, addressData, userId, isAdmin);
      res.json(address);
    } catch (error) {
      console.error('Update address controller error:', error);
      
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message });
    }
  };
  
  /**
   * DELETE /api/users/:userId/addresses/:addressId
   * Delete address
   */
  export const deleteAddressControl = async (req, res) => {
    try {
      const { userId, addressId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only delete their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only delete your own addresses' 
        });
      }
  
      const address = await deleteAddress(addressId, userId, isAdmin);
      res.json({ 
        message: 'Address deleted successfully',
        address 
      });
    } catch (error) {
      console.error('Delete address controller error:', error);
      
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * PUT /api/users/:userId/addresses/:addressId/set-default
   * Set address as default
   */
  export const setDefaultAddressControl = async (req, res) => {
    try {
      const { userId, addressId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only modify their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only modify your own addresses' 
        });
      }
  
      const address = await setDefaultAddress(addressId, userId, isAdmin);
      res.json(address);
    } catch (error) {
      console.error('Set default address controller error:', error);
      
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/users/:userId/addresses/:addressId/format
   * Get formatted address
   */
  export const getFormattedAddressControl = async (req, res) => {
    try {
      const { userId, addressId } = req.params;
      const { type = 'display' } = req.query;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only view their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only view your own addresses' 
        });
      }
  
      const address = await getAddressById(addressId, userId, isAdmin);
  
      let formatted;
      if (type === 'shipping') {
        formatted = formatShippingLabel(address);
      } else {
        formatted = formatAddress(address);
      }
  
      res.json({ 
        address,
        formatted,
        type 
      });
    } catch (error) {
      console.error('Get formatted address controller error:', error);
      
      if (error.message === 'Address not found') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * GET /api/users/:userId/addresses/check
   * Check if user has addresses
   */
  export const checkUserHasAddressesControl = async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.is_admin || false;
  
      // Users can only check their own addresses
      if (!isAdmin && requestingUserId !== userId) {
        return res.status(403).json({ 
          message: 'You can only check your own addresses' 
        });
      }
  
      const hasAddresses = await userHasAddresses(userId);
      const count = await getAddressCount(userId);
  
      res.json({ 
        has_addresses: hasAddresses,
        count 
      });
    } catch (error) {
      console.error('Check user has addresses controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
  
  /**
   * POST /api/users/:userId/addresses/validate
   * Validate address data (without saving)
   */
  export const validateAddressControl = async (req, res) => {
    try {
      const addressData = req.body;
      const validation = validateAddress(addressData);
  
      if (!validation.valid) {
        return res.status(400).json(validation);
      }
  
      res.json({ 
        valid: true,
        message: 'Address data is valid' 
      });
    } catch (error) {
      console.error('Validate address controller error:', error);
      res.status(500).json({ message: error.message });
    }
  };
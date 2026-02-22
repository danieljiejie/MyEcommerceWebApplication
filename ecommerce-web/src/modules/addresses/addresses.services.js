import db from "../../config/db.js";

/**
 * Get all addresses for a user
 */
export const getUserAddresses = async (userId) => {
  try {
    const result = await db.query(`
      SELECT * FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Get user addresses error:', error);
    throw error;
  }
};

/**
 * Get address by ID
 */
export const getAddressById = async (addressId, userId, isAdmin = false) => {
  try {
    let query = 'SELECT * FROM addresses WHERE id = $1';
    const params = [addressId];

    // Non-admin users can only access their own addresses
    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Address not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get address by ID error:', error);
    throw error;
  }
};

/**
 * Get user's default address
 */
export const getDefaultAddress = async (userId) => {
  try {
    const result = await db.query(`
      SELECT * FROM addresses
      WHERE user_id = $1 AND is_default = true
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      // If no default, return the most recent address
      const fallback = await db.query(`
        SELECT * FROM addresses
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      return fallback.rows[0] || null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get default address error:', error);
    throw error;
  }
};

/**
 * Create new address
 */
export const createAddress = async (addressData, userId) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const {
      address_label = 'Home',
      is_default = false,
      full_name,
      phone_number,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country_code
    } = addressData;

    // Validate required fields
    if (!full_name || !address_line1 || !city || !state_province || !postal_code || !country_code) {
      throw new Error('Missing required address fields: full_name, address_line1, city, state_province, postal_code, country_code');
    }

    // Validate country code format (2 letter ISO code)
    if (!/^[A-Z]{2}$/i.test(country_code)) {
      throw new Error('Country code must be a 2-letter ISO code (e.g., US, GB, MY)');
    }

    // If this is set as default, unset other default addresses
    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [userId]
      );
    } else {
      // If user has no addresses yet, make this one default
      const existingAddresses = await client.query(
        'SELECT COUNT(*) as count FROM addresses WHERE user_id = $1',
        [userId]
      );
      
      if (parseInt(existingAddresses.rows[0].count) === 0) {
        addressData.is_default = true;
      }
    }

    // Create address
    const result = await client.query(`
      INSERT INTO addresses (
        user_id,
        address_label,
        is_default,
        full_name,
        phone_number,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId,
      address_label,
      is_default || false,
      full_name,
      phone_number,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country_code.toUpperCase()
    ]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create address error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update address
 */
export const updateAddress = async (addressId, addressData, userId, isAdmin = false) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Check if address exists and user owns it
    let checkQuery = 'SELECT * FROM addresses WHERE id = $1';
    const checkParams = [addressId];

    if (!isAdmin) {
      checkQuery += ' AND user_id = $2';
      checkParams.push(userId);
    }

    const existingAddress = await client.query(checkQuery, checkParams);

    if (existingAddress.rows.length === 0) {
      throw new Error('Address not found or you do not have permission to update it');
    }

    const currentAddress = existingAddress.rows[0];

    // Extract fields
    const {
      address_label,
      is_default,
      full_name,
      phone_number,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country_code
    } = addressData;

    // Validate country code if provided
    if (country_code && !/^[A-Z]{2}$/i.test(country_code)) {
      throw new Error('Country code must be a 2-letter ISO code');
    }

    // If setting as default, unset other defaults
    if (is_default && !currentAddress.is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [currentAddress.user_id]
      );
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (address_label !== undefined) {
      paramCount++;
      updates.push(`address_label = $${paramCount}`);
      values.push(address_label);
    }

    if (is_default !== undefined) {
      paramCount++;
      updates.push(`is_default = $${paramCount}`);
      values.push(is_default);
    }

    if (full_name !== undefined) {
      paramCount++;
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
    }

    if (phone_number !== undefined) {
      paramCount++;
      updates.push(`phone_number = $${paramCount}`);
      values.push(phone_number);
    }

    if (address_line1 !== undefined) {
      paramCount++;
      updates.push(`address_line1 = $${paramCount}`);
      values.push(address_line1);
    }

    if (address_line2 !== undefined) {
      paramCount++;
      updates.push(`address_line2 = $${paramCount}`);
      values.push(address_line2);
    }

    if (city !== undefined) {
      paramCount++;
      updates.push(`city = $${paramCount}`);
      values.push(city);
    }

    if (state_province !== undefined) {
      paramCount++;
      updates.push(`state_province = $${paramCount}`);
      values.push(state_province);
    }

    if (postal_code !== undefined) {
      paramCount++;
      updates.push(`postal_code = $${paramCount}`);
      values.push(postal_code);
    }

    if (country_code !== undefined) {
      paramCount++;
      updates.push(`country_code = $${paramCount}`);
      values.push(country_code.toUpperCase());
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(addressId);

    const query = `
      UPDATE addresses 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update address error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete address
 */
export const deleteAddress = async (addressId, userId, isAdmin = false) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Check ownership
    let checkQuery = 'SELECT * FROM addresses WHERE id = $1';
    const checkParams = [addressId];

    if (!isAdmin) {
      checkQuery += ' AND user_id = $2';
      checkParams.push(userId);
    }

    const existingAddress = await client.query(checkQuery, checkParams);

    if (existingAddress.rows.length === 0) {
      throw new Error('Address not found or you do not have permission to delete it');
    }

    const address = existingAddress.rows[0];
    const wasDefault = address.is_default;
    const addressUserId = address.user_id;

    // Delete the address
    await client.query('DELETE FROM addresses WHERE id = $1', [addressId]);

    // If deleted address was default, set another address as default
    if (wasDefault) {
      const remainingAddresses = await client.query(
        'SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [addressUserId]
      );

      if (remainingAddresses.rows.length > 0) {
        await client.query(
          'UPDATE addresses SET is_default = true WHERE id = $1',
          [remainingAddresses.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    return address;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete address error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Set address as default
 */
export const setDefaultAddress = async (addressId, userId, isAdmin = false) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Check if address exists and user owns it
    let checkQuery = 'SELECT * FROM addresses WHERE id = $1';
    const checkParams = [addressId];

    if (!isAdmin) {
      checkQuery += ' AND user_id = $2';
      checkParams.push(userId);
    }

    const existingAddress = await client.query(checkQuery, checkParams);

    if (existingAddress.rows.length === 0) {
      throw new Error('Address not found or you do not have permission to modify it');
    }

    const address = existingAddress.rows[0];

    // Unset all default addresses for this user
    await client.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [address.user_id]
    );

    // Set this address as default
    const result = await client.query(
      'UPDATE addresses SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [addressId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Set default address error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Format address for display
 */
export const formatAddress = (address) => {
  if (!address) return '';

  const parts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state_province,
    address.postal_code,
    getCountryName(address.country_code)
  ].filter(Boolean);

  return parts.join(', ');
};

/**
 * Format address for shipping label
 */
export const formatShippingLabel = (address) => {
  if (!address) return '';

  return `${address.full_name}
${address.address_line1}
${address.address_line2 ? address.address_line2 + '\n' : ''}${address.city}, ${address.state_province} ${address.postal_code}
${getCountryName(address.country_code)}
${address.phone_number ? 'Phone: ' + address.phone_number : ''}`.trim();
};

/**
 * Validate address completeness
 */
export const validateAddress = (address) => {
  const required = [
    'full_name',
    'address_line1',
    'city',
    'state_province',
    'postal_code',
    'country_code'
  ];

  const missing = required.filter(field => !address[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }

  // Validate country code format
  if (!/^[A-Z]{2}$/i.test(address.country_code)) {
    return {
      valid: false,
      message: 'Invalid country code format'
    };
  }

  return { valid: true };
};

/**
 * Get country name from ISO code (basic mapping)
 */
const getCountryName = (code) => {
  const countries = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'IN': 'India',
    'CN': 'China',
    'JP': 'Japan',
    'KR': 'South Korea',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'CL': 'Chile',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'ID': 'Indonesia'
  };

  return countries[code?.toUpperCase()] || code;
};

/**
 * Check if user has any addresses
 */
export const userHasAddresses = async (userId) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM addresses WHERE user_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Check user has addresses error:', error);
    throw error;
  }
};

/**
 * Get address count for user
 */
export const getAddressCount = async (userId) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM addresses WHERE user_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Get address count error:', error);
    throw error;
  }
};
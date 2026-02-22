import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../config/db.js";
import { OAuth2Client } from "google-auth-library";
import { sendPasswordResetOTP } from "../../utils/email.util.js";
import crypto from "crypto";

// Initializing with both credentials
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET, 
  'postmessage'
);

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const register = async ({ email, password, first_name, last_name, phone }) => {
  try {
    // Check if user exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, phone, is_admin, created_at`,
      [email, hashedPassword, first_name, last_name, phone]
    );

    const user = result.rows[0];

    // Create empty cart for user
    await db.query(
      "INSERT INTO carts (user_id) VALUES ($1)",
      [user.id]
    );

    // Generate token
    const token = generateToken(user);

    return { 
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        is_admin: user.is_admin,
      },
      accessToken: token 
    };
  } catch (error) {
    console.error('Register service error:', error);
    throw error;
  }
};

export const login = async ({ email, password }) => {
  try {
    // Find user
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result.rows[0];



    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        is_admin: user.is_admin,
      },
      accessToken: token,
    };
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }
};
// src/modules/auth/auth.services.js

export const loginWithGoogle = async (idToken) => {
  // 1. Verify Google Token
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { email, sub: googleId, given_name, family_name } = payload;

  // 2. Check if user exists in YOUR database
  let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  let user;

  if (result.rows.length === 0) {
    // 3. If user doesn't exist, REGISTER them automatically
    const newUserResult = await db.query(
      `INSERT INTO users (email, first_name, last_name, google_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, given_name, family_name, googleId]
    );
    user = newUserResult.rows[0];

    // FIX: Create empty cart for the new Google user
    await db.query(
      "INSERT INTO carts (user_id) VALUES ($1)",
      [user.id]
    );
  } else {
    // 4. If user exists, update their google_id if it's missing
    user = result.rows[0];
    if (!user.google_id) {
      await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
    }
  }

  // 5. Generate YOUR App's JWT (FIXED: Added JWT_SECRET)
  const appToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin || false,
    },
    process.env.JWT_SECRET, // <--- MUST ADD THIS
    { expiresIn: "7d" }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin || false,
    },
    accessToken: appToken
  };
};

export const getCurrentUser = async (userId) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, is_admin, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Add to auth.services.js

export const updateProfile = async (userId, data) => {
  try {
    const { first_name, last_name, phone } = data;
    
    // COALESCE ensures that if a value is undefined/null, it keeps the existing database value
    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           phone = COALESCE($3, phone),
           updated_at = NOW()
       WHERE id = $4 
       RETURNING id, email, first_name, last_name, phone, is_admin`,
      [first_name, last_name, phone, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  } catch (error) {
    console.error('Update profile service error:', error);
    throw error;
  }
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  try {
    // 1. Get current password hash
    const result = await db.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = result.rows[0];

    // 2. Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      throw new Error("Incorrect current password");
    }

    // 3. Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );

    return { message: "Password updated successfully" };
  } catch (error) {
    console.error('Change password service error:', error);
    throw error;
  }
};

// ─── Helper: generate secure 6-digit OTP ─────────────────────────────────────
const generateOTP = () => {
  // crypto.randomInt gives a cryptographically secure random integer
  return String(crypto.randomInt(100000, 999999));
};

// ─── 1. Request Password Reset ────────────────────────────────────────────────
// POST /api/auth/forgot-password
// - Looks up the user by email
// - Generates a 6-digit OTP, hashes it, stores in password_reset_tokens
// - Sends the OTP to the user's email
// - Always returns 200 even if email not found (prevents email enumeration)

export const requestPasswordReset = async (email) => {
  // Look up user — don't reveal whether email exists to the caller
  const userResult = await db.query(
    "SELECT id, email FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );

  // Even if user not found, return success to prevent email enumeration attacks
  if (userResult.rows.length === 0) {
    return { message: "If that email is registered, a reset code has been sent." };
  }

  const user = userResult.rows[0];

  // Invalidate any existing unused tokens for this email
  await db.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE",
    [user.email]
  );

  // Generate OTP
  const otp       = generateOTP();                             // "847291"
  const otpHash   = await bcrypt.hash(otp, 10);               // hashed for storage
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);    // 15 minutes from now

  // Store in DB
  await db.query(
    `INSERT INTO password_reset_tokens (email, otp_hash, otp_expires_at)
     VALUES ($1, $2, $3)`,
    [user.email, otpHash, expiresAt]
  );

  // Send the plain OTP via email (never store/return plain OTP)
  await sendPasswordResetOTP(user.email, otp);

  return { message: "If that email is registered, a reset code has been sent." };
};

// ─── 2. Verify OTP ────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// - Finds the most recent unused, unexpired token for this email
// - Compares the submitted OTP against the stored hash
// - If valid: grants a short-lived reset_token and returns it to the frontend
//             (frontend uses this token to authorize the final password reset step)
// - The reset_token itself is random, not the OTP

export const verifyResetOTP = async (email, otp) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the most recent valid token for this email
  const result = await db.query(
    `SELECT id, otp_hash, otp_expires_at
     FROM password_reset_tokens
     WHERE email = $1
       AND used = FALSE
       AND otp_expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    throw new Error("This code has expired or is invalid. Please request a new one.");
  }

  const record = result.rows[0];

  // Verify OTP against hash
  const valid = await bcrypt.compare(String(otp).trim(), record.otp_hash);
  if (!valid) {
    throw new Error("Incorrect code. Please check your email and try again.");
  }

  // OTP is correct — generate a reset_token that gates the final step
  const resetToken        = crypto.randomBytes(32).toString("hex");  // 64-char hex string
  const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);   // 10 minutes

  await db.query(
    `UPDATE password_reset_tokens
     SET reset_token = $1, reset_token_expires_at = $2
     WHERE id = $3`,
    [resetToken, resetTokenExpires, record.id]
  );

  return { resetToken };
};

// ─── 3. Reset Password ────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// - Verifies the reset_token (granted in step 2) is valid and unexpired
// - Hashes the new password and updates the user record
// - Marks the token as used so it can't be replayed

export const resetPassword = async (email, resetToken, newPassword) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the token record
  const result = await db.query(
    `SELECT id
     FROM password_reset_tokens
     WHERE email = $1
       AND reset_token = $2
       AND used = FALSE
       AND reset_token_expires_at > NOW()
     LIMIT 1`,
    [normalizedEmail, resetToken]
  );

  if (result.rows.length === 0) {
    throw new Error("Reset session expired. Please start over.");
  }

  const record = result.rows[0];

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
    [hashedPassword, normalizedEmail]
  );

  // Mark token as used — prevents replay
  await db.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
    [record.id]
  );

  return { message: "Password reset successfully. You can now log in with your new password." };
};
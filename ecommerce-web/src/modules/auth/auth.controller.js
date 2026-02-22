import { register, login, getCurrentUser,loginWithGoogle, updateProfile,
   changePassword, requestPasswordReset,verifyResetOTP, resetPassword } from "./auth.services.js";

export const registerControl = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const data = await register(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const loginControl = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const data = await login(req.body);
    res.json(data);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message });
  }
};

export const googleLoginControl = async (req, res, next) => {
  try {
    const { token } = req.body; // The token sent from frontend
    const result = await loginWithGoogle(token);
    res.json(result); // Returns { user, token } just like normal login
  } catch (error) {
    next(error);
  }
};

export const meControl = async (req, res) => {
  try {
    const user = await getCurrentUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const logoutControl = async (req, res) => {
  // In a token-based system, logout is handled client-side
  // But you can implement token blacklisting here if needed
  res.json({ message: "Logged out successfully" });
};

export const updateProfileControl = async (req, res) => {
  try {
    const { userId } = req.params;

    // Security Check: Only the owner (or an admin) can update this profile
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

    const updatedUser = await updateProfile(userId, req.body);
    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const changePasswordControl = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Security Check: Only the owner can change their password
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Not authorized to change this password" });
    }

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const result = await changePassword(userId, { currentPassword, newPassword });
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ message: error.message });
  }
};


// ─── Forgot Password — Step 1: Request OTP ────────────────────────────────────
// POST /api/auth/forgot-password
// Public route — no auth required
export const forgotPasswordControl = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await requestPasswordReset(email);
    // Always 200 — we never reveal whether the email exists
    res.json(result);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return 200 to prevent email enumeration; log the real error server-side
    res.json({ message: "If that email is registered, a reset code has been sent." });
  }
};

// ─── Forgot Password — Step 2: Verify OTP ────────────────────────────────────
// POST /api/auth/verify-otp
// Public route — no auth required
export const verifyOTPControl = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP code are required." });
    }

    // Returns { resetToken } on success
    const result = await verifyResetOTP(email, otp);
    res.json(result);
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(400).json({ message: error.message });
  }
};

// ─── Forgot Password — Step 3: Reset Password ────────────────────────────────
// POST /api/auth/reset-password
// Public route — no auth required (reset_token from step 2 is the authorization)
export const resetPasswordControl = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Email, reset token, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const result = await resetPassword(email, resetToken, newPassword);
    res.json(result);
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({ message: error.message });
  }
};

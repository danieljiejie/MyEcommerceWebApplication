import express from "express";
import {
  registerControl, 
  loginControl, 
  googleLoginControl,
  meControl, 
  logoutControl,
  updateProfileControl,
  changePasswordControl,
  forgotPasswordControl,
  verifyOTPControl,
  resetPasswordControl
} from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = express.Router();


router.post("/register", registerControl);
router.post("/login", loginControl);
router.get("/me", authenticate, meControl);
router.post("/logout", authenticate, logoutControl);
router.post("/google",googleLoginControl)
router.put("/users/:userId", authenticate, updateProfileControl);
router.put("/users/:userId/password", authenticate, changePasswordControl);
router.post("/forgot-password", forgotPasswordControl);   // Step 1: request OTP
router.post("/verify-otp",      verifyOTPControl);        // Step 2: verify OTP → get resetToken
router.post("/reset-password",  resetPasswordControl);    // Step 3: set new password


export default router;
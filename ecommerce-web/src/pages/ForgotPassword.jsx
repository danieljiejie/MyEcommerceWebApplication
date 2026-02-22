// src/pages/ForgotPassword.jsx
// Reached via: <Link to="/forgot-password"> in Login.jsx
// Register in your router: <Route path="/forgot-password" element={<ForgotPassword />} />
// Flow:
//   Step 1 — Enter email → backend sends 6-digit OTP
//   Step 2 — Enter OTP  → backend verifies, grants resetToken
//   Step 3 — Enter new password → backend resets, user redirected to login

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, verifyOTP, resetPassword } from "../services/api";
import AuthLayout from "../components/AuthLayout";
import {
  ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, RefreshCw, ShieldCheck,
} from "lucide-react";

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: "Email"    },
  { num: 2, label: "Verify"   },
  { num: 3, label: "Reset"    },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const done   = step.num < current;
        const active = step.num === current;
        return (
          <div key={step.num} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : step.num}
              </div>
              <span className={`text-xs font-medium ${active ? "text-gray-900" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-10 h-px mb-4 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── OTP Input — 6 individual boxes ──────────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits    = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.slice(0, index) + value.slice(index + 1);
      onChange(next);
      if (index > 0) inputRefs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft"  && index > 0) { inputRefs.current[index - 1]?.focus(); return; }
    if (e.key === "ArrowRight" && index < 5) { inputRefs.current[index + 1]?.focus(); return; }
  };

  const handleChange = (e, index) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1); // digits only
    if (!char) return;
    const next = value.slice(0, index) + char + value.slice(index + 1);
    onChange(next.slice(0, 6));
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  return (
    <div className="flex items-center gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
            ${digit ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}
            focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}

// ─── Password field with show/hide ────────────────────────────────────────────
function PasswordField({ label, name, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          disabled={disabled}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Password strength bar ────────────────────────────────────────────────────
function StrengthBar({ password }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= score ? colors[score] : "bg-gray-100"}`} />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs mt-1 font-medium ${colors[score].replace("bg-", "text-")}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate();

  // Shared state across steps
  const [step,       setStep]       = useState(1);
  const [email,      setEmail]      = useState("");
  const [otp,        setOtp]        = useState("");
  const [resetToken, setResetToken] = useState("");  // granted after OTP verified

  // Per-step UI state
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);

  // Step 3 specific
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });

  // Resend cooldown
  const [resendTimer,  setResendTimer]  = useState(0);
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  // ── Step 1: Request OTP ─────────────────────────────────────────────────────
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await forgotPassword(email);
      // Backend always returns 200 (even for unknown emails) to prevent enumeration
      setSuccess("A 6-digit code has been sent to your email. Check your inbox and spam folder.");
      setStep(2);
      setResendTimer(60); // 60s cooldown before resend
    } catch (err) {
      // Network error only (backend itself returns 200)
      setError(err.message || "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    clearMessages();
    setOtp("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess("A new code has been sent to your email.");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "Could not resend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    clearMessages();

    if (otp.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      // Returns { resetToken }
      const data = await verifyOTP(email, otp);
      setResetToken(data.resetToken);
      setSuccess("Code verified! Now set your new password.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid or expired code. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ───────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, resetToken, passwords.newPassword);
      // Success — navigate to login with success state so Login.jsx shows the banner
      navigate("/login", {
        state: { registered: true }, // reuses the green "Account ready" banner in Login.jsx
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Failed to reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="We'll send a code to your email to verify it's you."
      image="https://images.unsplash.com/photo-1555421689-d68471e189f2?q=80&w=1000&auto=format&fit=crop"
    >
      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* ── Status Messages ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg mb-6">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — Enter email
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <form onSubmit={handleRequestOTP} className="space-y-5">
          <div className="text-center mb-2">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">
              Enter the email address associated with your account.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Sending Code..." : "Send Reset Code"}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — Enter OTP
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">
              Enter the 6-digit code we sent to{" "}
              <span className="font-semibold text-gray-800">{email}</span>
            </p>
            <button
              type="button"
              onClick={() => { setStep(1); clearMessages(); setOtp(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 mt-1 underline"
            >
              Wrong email?
            </button>
          </div>

          {/* OTP boxes */}
          <OTPInput value={otp} onChange={setOtp} disabled={loading} />

          {/* Resend */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-400">
                Resend code in{" "}
                <span className="font-semibold text-gray-600 tabular-nums">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mx-auto transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend code
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <button
            type="button"
            onClick={() => { setStep(1); clearMessages(); setOtp(""); }}
            className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — Set new password
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="text-center mb-2">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">
              Identity verified. Choose a strong new password.
            </p>
          </div>

          <PasswordField
            label="New Password"
            name="newPassword"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            placeholder="At least 6 characters"
            disabled={loading}
          />
          <StrengthBar password={passwords.newPassword} />

          <PasswordField
            label="Confirm New Password"
            name="confirmPassword"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="Re-enter your new password"
            disabled={loading}
          />

          {/* Inline mismatch hint */}
          {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
            <p className="text-xs text-red-500 flex items-center gap-1 -mt-2">
              <AlertCircle className="w-3 h-3" /> Passwords do not match
            </p>
          )}
          {passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword && (
            <p className="text-xs text-green-600 flex items-center gap-1 -mt-2">
              <CheckCircle className="w-3 h-3" /> Passwords match
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !passwords.newPassword ||
              !passwords.confirmPassword ||
              passwords.newPassword !== passwords.confirmPassword
            }
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
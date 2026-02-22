// src/components/ProfilePrivacy.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/api";
import {
  Shield, Eye, EyeOff, Lock, CheckCircle,
  AlertCircle, User, Mail, Phone, Calendar, BadgeCheck,
} from "lucide-react";

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-800 truncate">
          {value ?? <span className="text-gray-400 italic">Not provided</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────
function PasswordField({ name, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Password Strength Indicator ──────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Uppercase letter",       pass: /[A-Z]/.test(password) },
    { label: "Number",                 pass: /\d/.test(password) },
    { label: "Special character",      pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;

  const bar = [
    { min: 0, color: "bg-red-400",    label: "" },
    { min: 1, color: "bg-orange-400", label: "Weak" },
    { min: 2, color: "bg-yellow-400", label: "Fair" },
    { min: 3, color: "bg-blue-400",   label: "Good" },
    { min: 4, color: "bg-green-500",  label: "Strong" },
  ];
  const current = bar[score];

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? current.color : "bg-gray-100"
            }`}
          />
        ))}
        {current.label && (
          <span className={`text-xs font-semibold ml-1 ${current.color.replace("bg-", "text-")}`}>
            {current.label}
          </span>
        )}
      </div>

      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-xs">
            <CheckCircle
              className={`w-3.5 h-3.5 flex-shrink-0 ${c.pass ? "text-green-500" : "text-gray-300"}`}
            />
            <span className={c.pass ? "text-gray-700" : "text-gray-400"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfilePrivacy() {
  const { user } = useAuth();

  // Password form state
  const [passwords, setPasswords] = useState({
    current_password:  "",
    new_password:      "",
    confirm_password:  "",
  });
  const [pwStatus, setPwStatus]   = useState(null);   // "success" | "error"
  const [pwMessage, setPwMessage] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handlePwChange = (e) =>
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ─── Change Password Submit ──────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwStatus(null);

    // Client-side validation
    if (passwords.new_password !== passwords.confirm_password) {
      setPwStatus("error");
      setPwMessage("New passwords do not match.");
      return;
    }
    if (passwords.new_password.length < 6) {
      setPwStatus("error");
      setPwMessage("New password must be at least 6 characters.");
      return;
    }
    if (passwords.new_password === passwords.current_password) {
      setPwStatus("error");
      setPwMessage("New password must be different from your current password.");
      return;
    }

    setPwLoading(true);
    try {
      // PUT /api/users/:userId/password
      await changePassword(user.id, {
        current_password: passwords.current_password,
        new_password:     passwords.new_password,
      });

      setPwStatus("success");
      setPwMessage("Password changed successfully. Next login will use your new password.");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwStatus("error");
      // Surface backend error (e.g. "Current password is incorrect")
      setPwMessage(err.message || "Failed to change password. Please try again.");
    } finally {
      setPwLoading(false);
    }
  };

  const isGoogleUser = !!user?.google_id;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Account Information ─────────────────────────────────────────────── */}
      <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Privacy & Security</h2>
            <p className="text-sm text-gray-500 mt-0.5">Your account information and security settings</p>
          </div>
        </div>

        {/* Account Info */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Account Details
          </h3>

          <div className="bg-gray-50/60 rounded-xl px-5 border border-gray-100">
            <InfoRow
              icon={User}
              label="Full Name"
              value={
                user?.first_name || user?.last_name
                  ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                  : null
              }
            />
            <InfoRow icon={Mail}     label="Email Address" value={user?.email} />
            <InfoRow icon={Phone}    label="Phone Number"  value={user?.phone} />
            <InfoRow
              icon={Calendar}
              label="Member Since"
              value={
                user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : null
              }
            />
            <InfoRow
              icon={BadgeCheck}
              label="Account Type"
              value={user?.is_admin ? "Administrator" : "Customer"}
            />
          </div>
        </div>

        {/* Login Method */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Login Method
          </h3>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            {isGoogleUser ? (
              <>
                {/* Google badge */}
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Google Account</p>
                  <p className="text-xs text-gray-500 mt-0.5">You sign in with your Google account — no password needed.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email & Password</p>
                  <p className="text-xs text-gray-500 mt-0.5">You sign in with your email and password.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password ──────────────────────────────────────────────────── */}
      {isGoogleUser ? (
        // Google users have no password — show info banner
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Password managed by Google</p>
            <p className="text-sm text-blue-700 mt-1">
              Since you signed in with Google, your password is managed by your Google account.
              To change it, visit your{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Google Account security settings
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Use a strong, unique password you don't use elsewhere
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            {/* Current Password */}
            <PasswordField
              name="current_password"
              label="Current Password *"
              value={passwords.current_password}
              onChange={handlePwChange}
              placeholder="Enter your current password"
            />

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 pt-4">
              {/* New Password */}
              <PasswordField
                name="new_password"
                label="New Password *"
                value={passwords.new_password}
                onChange={handlePwChange}
                placeholder="Enter new password"
              />

              {/* Strength Indicator */}
              <PasswordStrength password={passwords.new_password} />
            </div>

            {/* Confirm New Password */}
            <div>
              <PasswordField
                name="confirm_password"
                label="Confirm New Password *"
                value={passwords.confirm_password}
                onChange={handlePwChange}
                placeholder="Re-enter new password"
              />
              {/* Mismatch hint */}
              {passwords.confirm_password && passwords.new_password !== passwords.confirm_password && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {passwords.confirm_password && passwords.new_password === passwords.confirm_password && (
                <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Status Banner */}
            {pwStatus && (
              <div
                className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
                  pwStatus === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {pwStatus === "success" ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{pwMessage}</span>
              </div>
            )}

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={
                  pwLoading ||
                  !passwords.current_password ||
                  !passwords.new_password ||
                  !passwords.confirm_password
                }
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {pwLoading ? "Changing Password..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
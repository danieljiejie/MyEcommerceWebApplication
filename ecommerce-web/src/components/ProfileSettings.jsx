// src/components/ProfileSettings.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/api";
import { User, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name:  "",
    email:      "",
    phone:      "",
  });

  const [status, setStatus]   = useState(null);  // "success" | "error"
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ─── Pre-fill form from AuthContext user ────────────────────────────────────
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name ?? "",
        last_name:  user.last_name  ?? "",
        email:      user.email      ?? "",
        phone:      user.phone      ?? "",
      });
    }
  }, [user]);
  console.log(user)
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setIsDirty(true);
    setStatus(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    setLoading(true);
    setStatus(null);

    try {
      // PUT /api/users/:userId
      const updated = await updateProfile(user.id, {
        first_name: formData.first_name,
        last_name:  formData.last_name,
        email:      formData.email,
        phone:      formData.phone || null,
      });
      console.log("Updated from backend:", updated);

      // Merge updated fields back into AuthContext — keeps header/nav in sync
      updateUser({
        ...user,
        first_name: formData.first_name,
        last_name:  formData.last_name,
        email:      formData.email,
        phone:      formData.phone,
      });
      setStatus("success");
      setMessage("Profile updated successfully.");
      setIsDirty(false);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update your name, email and contact details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              First Name
            </label>
            <input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Last Name
            </label>
            <input
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Phone Number
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0123456789"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
              status === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {status === "success" ? (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !isDirty}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  first_name: user?.first_name ?? "",
                  last_name:  user?.last_name  ?? "",
                  email:      user?.email      ?? "",
                  phone:      user?.phone      ?? "",
                });
                setIsDirty(false);
                setStatus(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
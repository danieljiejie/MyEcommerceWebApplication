import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, loginWithGoogle } from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page user was trying to access, or default to home
  const from = location.state?.from?.pathname || "/";
  
  // Check if user just registered
  const justRegistered = location.state?.registered;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await loginUser({ email, password });

      // Check if response contains the access token
      if (!data.accessToken) {
        throw new Error("No access token received from server");
      }

      // Save JWT in context (which saves to localStorage)
      login(data.accessToken);

      // Redirect to the page they were trying to access, or home
      navigate(from, { replace: true });
    } catch (err) {
      // Handle different types of errors
      if (err.message.includes("credentials") || err.message.includes("password") || err.message.includes("email")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message.includes("network") || err.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else if (err.message.includes("cart") || err.message.includes("duplicate")) {
        // Handle cart-related errors gracefully
        console.error("Cart sync error:", err);
        setError("Login successful but encountered a cart sync issue. Please contact support if this persists.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError(null);

    try {
      // Send Google token to backend
      const data = await loginWithGoogle(credentialResponse.credential);

      if (!data.accessToken) {
        throw new Error("No access token received from server");
      }

      // Save JWT in context
      login(data.accessToken);

      // Redirect
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login Failure
  const handleGoogleError = () => {
    setError("Google login was cancelled or failed. Please try again.");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue shopping."
      image="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Success Alert - Show after registration */}
        {justRegistered && (
          <div className="flex items-start gap-3 p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>Account created successfully! Please sign in.</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Login Button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            logo_alignment="left"
          />
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
            placeholder="Enter your email"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <Link 
              to="/forgot-password"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Don't have an account?
            </span>
          </div>
        </div>

        {/* Register Link */}
        <Link
          to="/register"
          className="block w-full text-center border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Create an account
        </Link>
      </form>
    </AuthLayout>
  );
}
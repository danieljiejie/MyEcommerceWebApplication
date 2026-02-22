// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // ─── Bootstrap: fetch user on load if token exists ──────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch {
          // Token is invalid or expired — clear everything
          _clearAuth();
        }
      }
      setLoading(false);
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only on mount — token changes are handled by login/logout

  // ─── Internal helper ────────────────────────────────────────────────────────
  const _clearAuth = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  // ─── Login ───────────────────────────────────────────────────────────────────
  // Accepts the accessToken + optionally the user object returned by the backend.
  // Passing userData avoids an extra GET /api/auth/me roundtrip after login.
  //
  // Backend returns: { user: {...}, accessToken: "..." }
  // Usage:
  //   const data = await loginUser({ email, password });
  //   login(data.accessToken, data.user);
  //
  const login = useCallback(async(accessToken, userData = null) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    if (!userData) {
      try {
        const fetchedUser = await getCurrentUser();
        setUser(fetchedUser);
      } catch (err) {
        _clearAuth();
      }
    } else {
      setUser(userData);
    }
    
    setLoading(false);
    // If userData not provided, the useEffect won't re-run (token state didn't change
    // from null→value because we set it above). Call getCurrentUser manually if needed.
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    _clearAuth();
  }, []);

  // ─── Update user in context (e.g. after profile save) ───────────────────────
  // Merges partial updates so callers don't need to pass the full user object.
  //
  // Usage:
  //   updateUser({ first_name: "Daniel", phone: "012..." });
  //
  const updateUser = useCallback((partialUpdate) => {
    setUser((prev) => (prev ? { ...prev, ...partialUpdate } : partialUpdate));
    localStorage.setItem("user", JSON.stringify(partialUpdate));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
        isAdmin: !!user?.is_admin,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
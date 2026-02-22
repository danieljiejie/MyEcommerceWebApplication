import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { LogIn, LogOut, User } from "lucide-react";
import { logoutUser } from "../services/api";

export default function Header({ onSearch }) {
  const { cart  } = useCart();
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  // Memoize total to avoid recalculating unless cart changes
  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0), 
  [cart]);

  // Debounce search to prevent excessive filtering/API calls
  const handleSearchChange = (e) => {
    const value = e.target.value;
    // You could implement a proper debounce here or handle it in the parent
    onSearch(value);
  };

  const handleLogout = async () => {
    try {
      // Step A: Tell the backend to logout
      await logoutUser(); 
    } catch (err) {
      console.error("Backend logout failed", err);
    } finally {
      // Step B: Clear local state (Context) regardless of API success
      logout(); 
      // Step C: Send them home
      navigate("/");
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto p-4 flex justify-between items-center gap-4">
        <Link to="/">
          <h1 className="text-2xl font-extrabold tracking-tight text-black cursor-pointer whitespace-nowrap">
            MyStore
          </h1>
        </Link>

        <div className="relative flex-1 max-w-md mx-4">
          <input
            type="text"
            placeholder="Search products..."
            onChange={handleSearchChange}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Account Link - NEW */}
              <Link to="/account">
                <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Account</span>
                </button>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-red-600 hover:bg-gray-100 border-t cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login">
              <button className="flex items-center gap-2 border border-gray-800 px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            </Link>
          )}

          {/* Cart Button */}
          <Link to="/cart">
            <button className="relative border border-gray-800 px-5 py-2 rounded-lg hover:bg-black hover:text-white transition-colors cursor-pointer whitespace-nowrap">
              Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
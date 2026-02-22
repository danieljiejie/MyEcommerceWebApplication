// src/pages/ProfilePage.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileSettings  from "../components/ProfileSettings";
import ProfileAddresses from "../components/ProfileAddresses";
import ProfilePrivacy   from "../components/ProfilePrivacy";
import {
  User, MapPin, Shield, ShoppingBag,
  LogOut, ChevronRight, Menu, X,
} from "lucide-react";

// ─── Navigation Config ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    key:         "settings",
    label:       "General Settings",
    description: "Name, email & contact",
    path:        "/profile",
    icon:        User,
    component:   ProfileSettings,
  },
  {
    key:         "addresses",
    label:       "Addresses",
    description: "Manage delivery addresses",
    path:        "/profile/addresses",
    icon:        MapPin,
    component:   ProfileAddresses,
  },
  {
    key:         "privacy",
    label:       "Privacy & Security",
    description: "Password & account info",
    path:        "/profile/privacy",
    icon:        Shield,
    component:   ProfilePrivacy,
  },
];

// ─── Avatar Initials ──────────────────────────────────────────────────────────
function getInitials(user) {
  if (!user) return "?";
  const f = user.first_name?.[0] ?? "";
  const l = user.last_name?.[0]  ?? "";
  return (f + l).toUpperCase() || user.email?.[0]?.toUpperCase() || "?";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout }   = useAuth();
  const location           = useLocation();
  const navigate           = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Derive active tab from URL path
  const activeItem =
    NAV_ITEMS.find((item) => item.path === location.pathname) ?? NAV_ITEMS[0];

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleNav = (path) => navigate(path);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const ActiveComponent = activeItem.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Mobile Top Bar ─────────────────────────────────────────────────── */}
        <div className="lg:hidden flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {getInitials(user)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : user?.email}
              </p>
              <p className="text-xs text-gray-400">{activeItem.label}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="lg:hidden mb-5 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
            {NAV_ITEMS.map((item) => {
              const Icon     = item.icon;
              const isActive = item.key === activeItem.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                    isActive ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-gray-900" : "text-gray-400"}`} />
                  <span className={`text-sm font-semibold ${isActive ? "text-gray-900" : "text-gray-600"}`}>
                    {item.label}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        )}

        {/* ── Desktop Layout: Sidebar + Content ─────────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-3 sticky top-8">

            {/* User Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-1">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-base font-bold flex-shrink-0 shadow-inner">
                  {getInitials(user)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate text-sm leading-tight">
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name ?? ""}`.trim()
                      : "Your Account"}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Member badge */}
              {user?.is_admin && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <span className="text-xs font-semibold text-amber-700">Admin</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {NAV_ITEMS.map((item, i) => {
                const Icon     = item.icon;
                const isActive = item.key === activeItem.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.path)}
                    className={`w-full group flex items-center gap-3.5 px-4 py-4 transition-all relative
                      ${i < NAV_ITEMS.length - 1 ? "border-b border-gray-50" : ""}
                      ${isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r-full" />
                    )}

                    <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/10"
                        : "bg-gray-100 group-hover:bg-gray-200"
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"}`} />
                    </div>

                    <div className="text-left min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-tight ${isActive ? "text-white" : "text-gray-800"}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 truncate ${isActive ? "text-white/60" : "text-gray-400"}`}>
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isActive
                        ? "text-white/70 translate-x-0"
                        : "text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5"
                    }`} />
                  </button>
                );
              })}
            </nav>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => navigate("/orders")}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-b border-gray-50"
              >
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <span className="text-sm font-semibold">My Orders</span>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-500 hover:bg-red-50 transition-colors"
              >
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-sm font-semibold">Sign Out</span>
              </button>
            </div>
          </aside>

          {/* ── Main Content ─────────────────────────────────────────────────── */}
          <main className="min-w-0">
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 mb-5">
              <span>Account</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-700 font-semibold">{activeItem.label}</span>
            </div>

            {/* Active Component — no logic changes, just rendered here */}
            <ActiveComponent />
          </main>

        </div>
      </div>
    </div>
  );
}
// src/pages/Account.jsx
import { useState } from "react";
import OrderHistory from "../components/OrderHistory";
import ProfileSettings from "../components/ProfileSettings";
import ProfileAddresses from "../components/ProfileAddresses";
import ProfilePrivacy from "../components/ProfilePrivacy";
import { logoutUser } from "../services/api";

export default function Account() {
  const [activeTab, setActiveTab] = useState("orders");
  
  // const { logout } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <nav className="flex flex-col">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === "orders" 
                    ? "bg-black text-white" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Order History
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === "settings" 
                    ? "bg-black text-white" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setActiveTab("addresses")}
                className={`px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === "addresses" 
                    ? "bg-black text-white" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Addresses
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`px-6 py-4 text-left font-medium transition-colors ${
                  activeTab === "privacy" 
                    ? "bg-black text-white" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Privacy & Security
              </button>
              {/* <button
                onClick={logoutUser}
                className="px-6 py-4 text-left font-medium text-red-600 hover:bg-red-50 border-t border-gray-100"
              >
                Sign Out
              </button> */}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          {renderContent(activeTab)}
        </div>
      </div>
    </div>
  );
}

const renderContent = (activeTab) => {
  switch(activeTab) {
    case 'orders' : return <OrderHistory/>
    case 'settings': return <ProfileSettings />;
    case 'addresses': return <ProfileAddresses />;
    case 'privacy': return <ProfilePrivacy />;
    default: return <ProfileSettings />;
  }
}
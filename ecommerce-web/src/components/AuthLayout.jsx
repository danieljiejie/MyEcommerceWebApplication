import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

export default function AuthLayout({ children, title, subtitle, image }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left Side - Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mb-8">
              <ShoppingBag className="w-8 h-8 text-black" />
              <span className="text-2xl font-extrabold tracking-tight text-black">
                MyStore
              </span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
              <p className="text-gray-600">{subtitle}</p>
            </div>

            {/* Form Content */}
            {children}
          </div>

          {/* Right Side - Image */}
          <div className="hidden md:block relative bg-gradient-to-br from-black to-gray-800">
            <img
              src={image}
              alt="Authentication"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">
                Welcome to MyStore
              </h2>
              <p className="text-gray-200 text-lg">
                Discover amazing products and enjoy seamless shopping experience with us.
              </p>
              
              {/* Features */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  <span className="text-sm">Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  <span className="text-sm">30-day return policy</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  <span className="text-sm">Secure checkout & payments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
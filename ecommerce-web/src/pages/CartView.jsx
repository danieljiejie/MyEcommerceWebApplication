import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, Loader2 } from "lucide-react";

export default function CartView() {
  const { cart, cartData, removeFromCart, updateQuantity, loading } = useCart();
  const navigate = useNavigate();

  // Calculate totals from backend data or items
  const subtotal = cartData.items.reduce((accumulator, item) => {
    // We parse the subtotal to ensure it's a number, defaulting to 0 if it's missing or invalid
    const total = parseFloat(item.subtotal || 0);
    return accumulator + total;
  }, 0);
  // const subtotal = parseFloat(cartData.items[0].subtotal || 0);
  const shipping = subtotal > 50 ? 0 : (subtotal > 0 ? 5.99 : 0);
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  // Loading state
  if (loading && cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-500">Loading your cart...</p>
      </div>
    );
  }

  // Empty cart
  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10">
        <ShoppingBag className="w-24 h-24 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <Link 
          to="/" 
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-500 mt-1">
          {cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            // Backend returns: { cart_item_id, product_id, name, product_price, image_url, quantity, stock_quantity }
            const itemPrice = parseFloat(item.product_price);
            const itemSubtotal = itemPrice * item.quantity;
            const isOutOfStock = item.stock_quantity === 0;
            const lowStock = item.stock_quantity > 0 && item.stock_quantity <= 5;

            return (
              <div 
                key={item.cart_item_id} 
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Product Image */}
                  <Link to={`/product/${item.product_id}`} className="flex-shrink-0">
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-24 h-24 sm:w-32 sm:h-32 object-contain rounded-lg bg-gray-50 p-2" 
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.product_id}`}>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-gray-700 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      ${itemPrice.toFixed(2)}
                    </p>

                    {/* Stock warning */}
                    {isOutOfStock && (
                      <p className="text-sm text-red-600 font-medium mb-3">Out of stock</p>
                    )}
                    {lowStock && !isOutOfStock && (
                      <p className="text-sm text-orange-600 font-medium mb-3">
                        Only {item.stock_quantity} left in stock!
                      </p>
                    )}

                    {/* Quantity Controls & Remove Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Quantity:</span>
                        <div className="flex items-center border-2 border-gray-200 rounded-lg">
                          <button 
                            onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)} 
                            className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity <= 1 || loading}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)} 
                            className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity >= item.stock_quantity || loading}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.cart_item_id)} 
                        className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>

                    {/* Item Subtotal */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Item subtotal:</span>
                        <span className="font-semibold text-gray-900">
                          ${itemSubtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary - Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>
                  Subtotal ({cart.reduce((acc, item) => acc + item.quantity, 0)} items)
                </span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>Estimated Tax</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate("/checkout")} 
              className="w-full bg-black text-white py-4 rounded-lg hover:bg-gray-800 transition-colors font-semibold mb-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Proceed to Checkout
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              {shipping === 0 && subtotal > 50 ? (
                "🎉 You qualify for free shipping!"
              ) : (
                `Add $${(50 - subtotal).toFixed(2)} more for free shipping`
              )}
            </p>

            {/* Trust Badges */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>30-day return policy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
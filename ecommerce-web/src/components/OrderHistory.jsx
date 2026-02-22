import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyOrders, cancelOrder, getOrderWithProducts } from "../services/api";
import OrderDetailModal from "./OrderDetailModal";
import {
  Package, Clock, Truck, CheckCircle2,
  ShoppingBag, XCircle, AlertCircle, RefreshCw,
  RectangleCircle,
  ArrowRightCircle,
  Backpack
} from "lucide-react";

// ─── Status Mapping ──────────────────────────────────────────────────────────
// Backend statuses → frontend tab keys
const BACKEND_TO_TAB = {
  pending:    "to_pay",
  processing: "to_ship",
  shipped:    "to_receive",
  delivered:  "completed",
  cancelled:  "cancelled",
  returned: "returned"
};

// Frontend tab keys → backend status strings (for API filter param)
const TAB_TO_BACKEND = {
  to_pay:     "pending",
  to_ship:    "processing",
  to_receive: "shipped",
  completed:  "delivered",
  cancelled:  "cancelled",
  returned: "returned"
};

// ─── Tab Config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "to_pay",     label: "To Pay",     icon: Clock,        color: "text-yellow-700" },
  { key: "to_ship",    label: "To Ship",    icon: Package,      color: "text-blue-500"   },
  { key: "to_receive", label: "To Receive", icon: Truck,        color: "text-purple-500" },
  { key: "completed",  label: "Completed",  icon: CheckCircle2, color: "text-green-500"  },
  { key: "cancelled",  label: "Cancelled",  icon: XCircle,      color: "text-red-400"   },
  { key: "returned",  label: "Returned",  icon: Backpack,      color: "text-green-700"   },
];

const STATUS_BADGE = {
  to_pay:     { bg: "bg-orange-100", text: "text-orange-700", label: "Awaiting Payment" },
  to_ship:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "Processing"       },
  to_receive: { bg: "bg-purple-100", text: "text-purple-700", label: "In Transit"       },
  completed:  { bg: "bg-green-100",  text: "text-green-700",  label: "Delivered"        },
  cancelled:  { bg: "bg-gray-100",   text: "text-gray-500",   label: "Cancelled"        },
  returned:  { bg: "bg-green-100",   text: "text-green-500",   label: "Returned"        },
};

// ─── Normalise a raw backend order into the shape the UI expects ──────────────
//
// Backend returns:
//   { id, status: "processing", created_at, total_amount, order_items: [{ product_id, quantity, unit_price, ... }] }
//
// UI expects:
//   { id, status: "to_ship",  date, totalAmount, products: [{ productId, quantity, unitPrice }] }
//
function normaliseOrder(raw) {
  return {
    ...raw,
    // Map backend status → tab key
    status: BACKEND_TO_TAB[raw.status] ?? "to_pay",
    // Normalise date field (backend may use created_at or date)
    date: raw.created_at ?? raw.date,
    // Normalise order_items → products array
    products: (raw.order_items ?? raw.products ?? []).map((item) => ({
      productId: item.product_id ?? item.productId,
      quantity:  item.quantity,
      unitPrice: item.unit_price ?? item.unitPrice ?? null,
      // Optional snapshot fields the backend may include
      productName:  item.product_name  ?? null,
      productImage: item.product_image ?? null,
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OrderHistory() {
  const { user } = useAuth();

  const [orders, setOrders]             = useState([]);
  const [activeTab, setActiveTab]       = useState("to_pay");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);  // track which order is being cancelled
  const [orderProduct, setOrderProduct] = useState([]);

  // ─── Fetch orders for active tab ─────────────────────────────────────────
  const fetchOrders = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyOrders({ status: TAB_TO_BACKEND[tab] });
      // console.log("RAW ORDERS FROM API:", data);

      const ordersArray = data?.orders ?? data ?? [];

      if (!Array.isArray(ordersArray)) {
        // console.error("API did not return an array. Received:", data);
        setOrders([]);
        return;
      }

      // 1. Normalise orders first
      const normalised = ordersArray.map(normaliseOrder);

      // 2. For each order, call getOrderWithProducts to get real name + image_url
      // All fetched in parallel with Promise.all
      const enriched = await Promise.all(
        normalised.map(async (order) => {
          const productDetails = await getOrderWithProducts(order.id);
          // console.log("Products........", productDetails);
          // Build map: product_id → { productName, productImage }
          const detailMap = {};
          productDetails.forEach((p) => {
            detailMap[p.product_id] = {
              productName:  p.product_name,
              productImage: p.image_url,
            };
          });
          // Merge into each item in order.products
          return {
            ...order,
            products: productDetails.map((p) => ({
              productId: p.product_id,
              quantity: p.quantity,
              unitPrice: null,
              productName: p.product_name,
              productImage: p.product_image,
            })),
          };
        })
      );

      setOrders(enriched);
    } catch (err) {
      setError(err.message || "Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever the active tab changes
  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  // ─── Cancel Order ─────────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      // Remove the cancelled order from the current list and refresh
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      alert(err.message || "Could not cancel order. It may have already been shipped.");
    } finally {
      setCancellingId(null);
    }
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your order history</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="bg-gray-100 h-16 w-full" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage your order history</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon     = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[130px] px-4 py-4 flex flex-col items-center gap-2 transition-all border-b-2 ${
                  isActive
                    ? "border-black bg-gray-50"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? tab.color : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${isActive ? "text-gray-900" : "text-gray-500"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchOrders(activeTab)}
            className="flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && orders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No orders here</h3>
          <p className="text-gray-500 mb-6">
            You don't have any {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} orders.
          </p>
        </div>
      )}

      {/* Orders List */}
      {!error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const badge      = STATUS_BADGE[order.status] ?? STATUS_BADGE.to_pay;
            const totalItems = Number(order.total_quantity || 0);
            // console.log("fvffgfgfgf",order)
            const isCancelling = cancellingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {/* Products Preview */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-semibold text-grey-700">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order.products.slice(0, 3).map((item, idx) => (
                      <div
                        key={item.productId ?? idx}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        {/* Show product image snapshot if backend provides it, otherwise placeholder */}
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName ?? "Product"}
                            className="w-14 h-14 object-contain bg-white rounded-lg border border-gray-200 p-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="w-7 h-7 text-gray-300" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {item.productName ? (
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {item.productName}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">Product #{item.productId}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Qty: {item.quantity}
                            {item.unitPrice != null && ` · $${Number(item.unitPrice).toFixed(2)} each`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {order.products.length > 3 && (
                      <p className="text-sm text-gray-400 text-center py-1">
                        +{order.products.length - 3} more {order.products.length - 3 === 1 ? "item" : "items"}
                      </p>
                    )}
                  </div>
                </div>
                    
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Order Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(order.date).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                    </div>
                    {/* Show total amount from backend — no client-side recalculation */}
                    {order.total_amount != null && (
                      <>
                        <div className="h-8 w-px bg-gray-200" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
                          <p className="text-sm font-bold text-gray-900">
                            ${Number(order.total_amount).toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <span className={`${badge.bg} ${badge.text} px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide`}>
                    {badge.label}
                  </span>
                </div>

                

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition-colors flex items-center cursor-pointer gap-2"
                  >
                    View Full Details
                    <span className="text-lg">→</span>
                  </button>

                  <div className="flex gap-3">
                    {/* To Pay — proceed to payment */}
                    {activeTab === "to_pay" && (
                      <>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={isCancelling}
                          className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:border-red-300 hover:text-red-600 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                        <button className="bg-black text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 cursor-pointer transition-colors">
                          Pay Now
                        </button>
                      </>
                    )}

                    {/* To Ship — can still cancel before shipped */}
                    {activeTab === "to_ship" && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCancelling}
                        className="border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-semibold hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {isCancelling ? "Cancelling..." : "Cancel Order"}
                      </button>
                    )}

                    {/* To Receive */}
                    {activeTab === "to_receive" && (
                      <>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:border-gray-400 transition-colors"
                        >
                          Track Package
                        </button>
                        {/* Confirm Received: backend status update would go here */}
                        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                          Confirm Received
                        </button>
                      </>
                    )}

                    {/* Completed */}
                    {activeTab === "completed" && (
                      <button className="border-2 border-black text-black px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                        Buy Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderCancelled={(id) => {
            setOrders((prev) => prev.filter((o) => o.id !== id));
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
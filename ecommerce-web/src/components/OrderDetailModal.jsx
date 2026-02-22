// src/components/OrderDetailModal.jsx
//
// Receives `order` already enriched by OrderHistory.fetchOrders.
// Each item in order.products has:
//   { productId, quantity, unitPrice (may be null), productName, productImage }
// — populated from getOrderWithProducts which returns:
//   { product_id, product_name, product_image, quantity }
// No extra product fetches needed.

import { useEffect, useState } from "react";
import { X, Package, MapPin, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { getOrderTimeline, cancelOrder } from "../services/api";
import TrackingTimeline from "./TrackingTimeline";

// ─── Status badge config (mirrors OrderHistory) ───────────────────────────────
const STATUS_BADGE = {
  to_pay:     { bg: "bg-orange-100", text: "text-orange-700", label: "Awaiting Payment" },
  to_ship:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "Processing"       },
  to_receive: { bg: "bg-purple-100", text: "text-purple-700", label: "In Transit"       },
  completed:  { bg: "bg-green-100",  text: "text-green-700",  label: "Delivered"        },
  cancelled:  { bg: "bg-gray-100",   text: "text-gray-500",   label: "Cancelled"        },
  returned:   { bg: "bg-green-100",  text: "text-green-500",  label: "Returned"         },
};

// ─── Product thumbnail with fallback ─────────────────────────────────────────
function ProductThumb({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Product"}
        className="w-20 h-20 object-contain bg-white rounded-xl border border-gray-100 p-2 flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
      <Package className="w-8 h-8 text-gray-300" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OrderDetailModal({ order, onClose, onOrderCancelled }) {
  const [timeline,       setTimeline]       = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelError,    setCancelError]    = useState(null);

  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.to_pay;

  // order.products is already enriched — each item has productName + productImage
  // from the getOrderWithProducts call in OrderHistory.fetchOrders
  const products    = order.products ?? [];
  const totalQty    = products.reduce((s, p) => s + p.quantity, 0);
  const displayTotal = order.total_amount != null ? Number(order.total_amount) : null;

  // ─── Load tracking timeline ────────────────────────────────────────────────
  useEffect(() => {
    setLoadingTimeline(true);
    getOrderTimeline(order.id)
      .then((data) => setTimeline(data ?? []))
      .catch(() => setTimeline([]))        // non-critical — fail silently
      .finally(() => setLoadingTimeline(false));
  }, [order.id]);

  // ─── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ─── Cancel order ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelOrder(order.id);
      onOrderCancelled?.(order.id);
      onClose();
    } catch (err) {
      setCancelError(err.message || "Could not cancel this order. It may have already been shipped.");
      setCancelling(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Sticky Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">#{order.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide`}>
              {badge.label}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* Order meta: date / items / payment */}
          <div className="grid grid-cols-3 gap-0 border-b bg-gray-50">
            <div className="flex items-start gap-3 px-6 py-4 border-r">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Order Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(order.date).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-6 py-4 border-r">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total Items</p>
                <p className="text-sm font-semibold text-gray-900">
                  {totalQty} {totalQty === 1 ? "item" : "items"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-6 py-4">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                <CreditCard className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Payment</p>
                <p className="text-sm font-semibold text-gray-900">
                  {order.status === "to_pay" ? "Pending" : "Paid"}
                </p>
                {order.payment_method && (
                  <p className="text-xs text-gray-400 capitalize mt-0.5">
                    {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Tracking Timeline ──────────────────────────────────────────── */}
          <div className="px-6 py-6 border-b">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              Order Tracking
            </h3>
            {loadingTimeline ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
              </div>
            ) : (
              <TrackingTimeline status={order.status} timelineEvents={timeline} />
            )}
          </div>

          {/* ── Shipping Address ───────────────────────────────────────────── */}
          {order.shipping_address && (
            <div className="px-6 py-5 border-b">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Delivery Address
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                {order.shipping_address}
              </p>
            </div>
          )}

          {/* ── Products ──────────────────────────────────────────────────── */}
          {/* Uses productName + productImage already set by OrderHistory enrichment */}
          <div className="px-6 py-5 border-b">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              Order Items ({products.length})
            </h3>

            <div className="space-y-3">
              {products.map((item, idx) => (
                <div
                  key={item.productId ?? idx}
                  className="flex gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4"
                >
                  {/* Image — from product_image field returned by getOrderWithProducts */}
                  <ProductThumb src={item.productImage} name={item.productName} />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                      {item.productName ?? `Product #${item.productId}`}
                    </h4>

                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">Quantity</p>
                        <p className="font-bold text-gray-900">×{item.quantity}</p>
                      </div>

                      {item.unitPrice != null && (
                        <>
                          <div className="h-8 w-px bg-gray-200" />
                          <div>
                            <p className="text-xs text-gray-400">Unit Price</p>
                            <p className="font-bold text-gray-900">
                              ${Number(item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                          <div className="h-8 w-px bg-gray-200" />
                          <div className="ml-auto text-right">
                            <p className="text-xs text-gray-400">Item Total</p>
                            <p className="font-bold text-gray-900">
                              ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Order Total ───────────────────────────────────────────────── */}
          <div className="px-6 py-5 bg-gray-50">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              {displayTotal != null ? (
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-700">Order Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ${displayTotal.toFixed(2)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center">Total not available</p>
              )}
            </div>

            {/* Cancel error */}
            {cancelError && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{cancelError}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-5 flex gap-3">
              {order.status === "to_pay" && (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Order"}
                  </button>
                  <button className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                    Proceed to Payment
                  </button>
                </>
              )}

              {order.status === "to_ship" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel Order"}
                </button>
              )}

              {order.status === "to_receive" && (
                <button className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                  Confirm Received
                </button>
              )}

              {order.status === "completed" && (
                <>
                  <button className="flex-1 border-2 border-black text-black py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                    Buy Again
                  </button>
                  <button className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                    Leave Review
                  </button>
                </>
              )}

              {order.status === "cancelled" && (
                <div className="flex-1 text-center py-3 text-gray-400 text-sm">
                  This order was cancelled.
                </div>
              )}

              {order.status === "returned" && (
                <div className="flex-1 text-center py-3 text-gray-400 text-sm">
                  This order has been returned.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
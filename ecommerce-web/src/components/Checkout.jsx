// src/pages/Checkout.jsx
// npm install @stripe/react-stripe-js @stripe/stripe-js
// Add to .env: VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createOrder, getDefaultAddress, getAddresses, createPaymentIntent } from "../services/api";
import { CreditCard, Truck, MapPin, Wallet, AlertCircle, ChevronDown, Lock, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

// ─── Stripe imports ───────────────────────────────────────────────────────────
import { loadStripe } from "@stripe/stripe-js";
import Toast from "./Toast";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

console.log(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// Initialise Stripe ONCE — outside the component so it never re-runs
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// Use the Env Var if it exists, otherwise fallback to the hardcoded string
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51T1hnVDzSpDB77m77DorGDzFA8d9vAF5EaC9AJKKt59oLIQkQ49AkiQgJXM5jojVtST9ikQ4t0pmyUjQKwjzDWd200bdGFtseh";

const stripePromise = loadStripe(STRIPE_KEY);

// ─── Stripe element shared styles ─────────────────────────────────────────────
const STRIPE_ELEMENT_STYLE = {
  style: {
    base: {
      fontSize:        "14px",
      color:           "#111827",
      fontFamily:      "ui-sans-serif, system-ui, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};


// ─── Stripe Card Form ─────────────────────────────────────────────────────────
// Split fields (number / expiry / CVC) for a polished checkout feel.
// onReady(boolean) fires whenever the combined validity changes so the parent
// knows whether to enable the Place Order button.
function StripeCardForm({ onReady }) {
  const [fieldState, setFieldState] = useState({ number: false, expiry: false, cvc: false });
  const [errorMsg,   setErrorMsg]   = useState(null);
  
  // const handleChange = (field) => (e) => {
  //   setErrorMsg(e.error ? e.error.message : null);
  //   setFieldState((prev) => {
  //     const next = { ...prev, [field]: e.complete && !e.error };
  //     onReady?.(next.number && next.expiry && next.cvc);
  //     return next;
  //   });
  // };
  
    const handleChange = (field) => (e) => {
      setErrorMsg(e.error ? e.error.message : null);
      setFieldState((prev) => ({
        ...prev,
        [field]: e.complete && !e.error 
      }));
    };

   
    useEffect(() => {
      onReady?.(fieldState.number && fieldState.expiry && fieldState.cvc);
    }, [fieldState, onReady]);

  const fieldClass =
    "w-full border border-gray-200 rounded-lg px-3 py-3 bg-white " +
    "focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent transition-shadow";

  return (
    <div className="mt-4 space-y-3">
      {/* Card Number */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Card Number
        </label>
        <div className={fieldClass}>
          <CardNumberElement options={STRIPE_ELEMENT_STYLE} onChange={handleChange("number")} />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Expiry Date
          </label>
          <div className={fieldClass}>
            <CardExpiryElement options={STRIPE_ELEMENT_STYLE} onChange={handleChange("expiry")} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            CVC
          </label>
          <div className={fieldClass}>
            <CardCvcElement options={STRIPE_ELEMENT_STYLE} onChange={handleChange("cvc")} />
          </div>
        </div>
      </div>

      {/* Stripe field validation error */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Security badge */}
      <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
        <Lock className="w-3.5 h-3.5" />
        <span>Secured by Stripe — card details never touch our servers.</span>
      </div>

      {/* Test card hint — only shown in development */}
      {import.meta.env.DEV && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
          <p className="font-semibold mb-1">🧪 Test Mode — use these Stripe test cards:</p>
          <p><span className="font-mono font-bold">4242 4242 4242 4242</span> — Payment succeeds</p>
          <p><span className="font-mono font-bold">4000 0000 0000 9995</span> — Card declined</p>
          <p><span className="font-mono font-bold">4000 0025 0000 3155</span> — Requires 3D Secure</p>
          <p className="mt-1 text-blue-500">Any future expiry · Any 3-digit CVC · Any ZIP</p>
        </div>
      )}
    </div>
  );
}

// ─── CheckoutInner ────────────────────────────────────────────────────────────
// Lives inside <Elements> so it can use useStripe() and useElements()
function CheckoutInner() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { cart, clearCart } = useCart();
  const { user }  = useAuth();
  const stripe    = useStripe();
  const elements  = useElements();

  // ── Checkout source (unchanged) ────────────────────────────────────────────
  const isBuyNow      = location.state?.mode === "buyNow";
  const checkoutItems = isBuyNow ? location.state.items : cart;

  // ── State — all original fields preserved + new Stripe fields ─────────────
  const [paymentMethod,     setPaymentMethod]     = useState("card");
  const [address,           setAddress]           = useState(null);
  const [allAddresses,      setAllAddresses]      = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [addressLoading,    setAddressLoading]    = useState(true);
  const [addressError,      setAddressError]      = useState(null);
  const [placing,           setPlacing]           = useState(false);
  const [orderError,        setOrderError]        = useState(null);
  // New Stripe state
  const [cardComplete,      setCardComplete]      = useState(false);
  const [paymentStep,       setPaymentStep]       = useState("idle");
  const [showToast, setShowToast] = useState(false);
  // "idle" | "creating_intent" | "confirming" | "creating_order"

  // ── Redirect if no items (unchanged) ──────────────────────────────────────
  useEffect(() => {
    if (!checkoutItems || checkoutItems.length === 0) navigate("/");
  }, [checkoutItems, navigate]);

  // ── Load addresses (unchanged) ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setAddressLoading(true);
    setAddressError(null);
    Promise.all([getDefaultAddress(user.id), getAddresses(user.id)])
      .then(([defaultAddr, allAddr]) => {
        setAddress(defaultAddr);
        setAllAddresses(allAddr || []);
      })
      .catch(() => setAddressError("Could not load your saved addresses. Please add one to continue."))
      .finally(() => setAddressLoading(false));
  }, [user?.id]);

  // ── Pricing (unchanged) ───────────────────────────────────────────────────
  if (!checkoutItems || checkoutItems.length === 0) return null;

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax      = subtotal * 0.1;
  const total    = subtotal + shipping + tax;

  // ── Address helpers (unchanged) ───────────────────────────────────────────
  const formatAddressDisplay = (addr) =>
    [addr.address_line1, addr.address_line2, `${addr.city}, ${addr.postal_code}`, addr.state_province, addr.country_code]
      .filter(Boolean).join(", ");

  const formatAddressForBackend = (addr) =>
    [addr.full_name, addr.address_line1, addr.address_line2, addr.city, addr.state_province, addr.postal_code, addr.country_code]
      .filter(Boolean).join(", ");

  // ── Place Order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!address) {
      setOrderError("Please select a delivery address before placing your order.");
      return;
    }

    setPlacing(true);
    setOrderError(null);

    try {
      // ── COD path — identical to original ───────────────────────────────────
      if (paymentMethod === "cod") {
        const orderPayload = {
          shipping_address:  formatAddressForBackend(address),
          payment_intent_id: "COD",
          payment_method:    "cod",
        };
        if (isBuyNow && location.state?.items?.length === 1) {
          const item = location.state.items[0];
          orderPayload.product_id = item.id;
          orderPayload.quantity   = item.quantity;
        }
        const createdOrder = await createOrder(orderPayload);
        // 1. Show the Toast
        setShowToast(true);

        // 2. Wait 1.5 seconds so the user can see it
        setTimeout(() => {
          if (!isBuyNow) clearCart();
          navigate("/order-success", { state: { order: createdOrder }, replace: true });
        }, 1500);
        // if (!isBuyNow) clearCart();
        // navigate("/order-success", { state: { order: createdOrder }, replace: true });
        return;
      }

      // ── Stripe card path ────────────────────────────────────────────────────
      if (!stripe || !elements) {
        setOrderError("Payment system is not ready. Please refresh the page and try again.");
        return;
      }
      if (!cardComplete) {
        setOrderError("Please complete all card fields before placing your order.");
        return;
      }

      // Step 1 — ask backend to create a PaymentIntent
      // Backend returns { clientSecret, paymentIntentId }
      setPaymentStep("creating_intent");
      const { clientSecret } = await createPaymentIntent(
        Math.round(total * 100), // Stripe requires integer cents
        "usd"
      );

      // Step 2 — confirm payment with Stripe directly from the browser
      // Card data goes straight to Stripe's servers — never touches our backend
      setPaymentStep("confirming");
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardNumberElement),
            billing_details: {
              name:  `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Customer",
              email: user?.email,
            },
          },
        }
      );

      if (stripeError) {
        // Stripe's error message is already user-friendly
        setOrderError(stripeError.message || "Payment was declined. Please check your card details.");
        setPlacing(false);
        setPaymentStep("idle");
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setOrderError(`Unexpected payment status: ${paymentIntent.status}. Please try again.`);
        setPlacing(false);
        setPaymentStep("idle");
        return;
      }

      // Step 3 — payment confirmed, now create the order in our backend
      // We pass the real Stripe pi_xxx ID so the backend can verify it
      setPaymentStep("creating_order");
      const orderPayload = {
        shipping_address:  formatAddressForBackend(address),
        payment_intent_id: paymentIntent.id,   // real "pi_3xxx..." Stripe ID
        payment_method:    "card",
      };
      if (isBuyNow && location.state?.items?.length === 1) {
        const item = location.state.items[0];
        orderPayload.product_id = item.id;
        orderPayload.quantity   = item.quantity;
      }

      const createdOrder = await createOrder(orderPayload);
      if (!isBuyNow) clearCart();
      navigate("/order-success", { state: { order: createdOrder }, replace: true });

    } catch (err) {
      setOrderError(err.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
      setPaymentStep("idle");
    }
  };

  // ── Dynamic button label ───────────────────────────────────────────────────
  const buttonLabel = placing
    ? { creating_intent: "Preparing Payment...", confirming: "Confirming with Stripe...", creating_order: "Creating Order..." }[paymentStep] ?? "Processing..."
    : paymentMethod === "cod" ? "Place Order" : "Pay & Place Order";

  // ── Button disabled logic ──────────────────────────────────────────────────
  const isButtonDisabled =
    placing ||
    addressLoading ||
    !!addressError ||
    !address ||
    (paymentMethod === "card" && (!stripe || !cardComplete));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {showToast && (
        <Toast 
          message="Payment successful! Redirecting..." 
          onClose={() => setShowToast(false)} 
        />
      )}
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Delivery Address — UNCHANGED ──────────────────────────────────── */}
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-black" />
              <h2 className="text-lg font-semibold">Delivery Address</h2>
            </div>

            {addressLoading ? (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
                <span className="text-sm">Loading address...</span>
              </div>
            ) : addressError ? (
              <div className="flex items-start gap-2 text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm">{addressError}</p>
                  <Link to="/account" className="text-sm text-blue-600 hover:underline mt-1 inline-block">Add an address →</Link>
                </div>
              </div>
            ) : address ? (
              <div className="text-gray-700">
                <p className="font-semibold">{address.full_name}</p>
                {address.phone_number && <p className="text-sm text-gray-500">{address.phone_number}</p>}
                <p className="mt-1">{address.address_line1}</p>
                {address.address_line2 && <p>{address.address_line2}</p>}
                <p>{address.city}, {address.postal_code}</p>
                <p>{address.state_province}, {address.country_code}</p>
                {address.address_label && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {address.address_label}
                  </span>
                )}
                {allAddresses.length > 1 && (
                  <div className="mt-3">
                    <button onClick={() => setShowAddressPicker((v) => !v)} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      Change Address
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAddressPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showAddressPicker && (
                      <div className="mt-3 space-y-2">
                        {allAddresses.map((addr) => (
                          <label key={addr.id} className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${address.id === addr.id ? "border-black bg-gray-50" : "hover:bg-gray-50"}`}>
                            <input type="radio" name="address" checked={address.id === addr.id} onChange={() => { setAddress(addr); setShowAddressPicker(false); }} className="mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium">{addr.full_name}</p>
                              <p className="text-gray-500">{formatAddressDisplay(addr)}</p>
                              {addr.is_default && <span className="text-xs text-green-600 font-medium">Default</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {allAddresses.length <= 1 && (
                  <Link to="/account" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Manage Addresses</Link>
                )}
              </div>
            ) : (
              <div className="text-gray-500">
                <p className="text-sm">No address saved yet.</p>
                <Link to="/account" className="text-sm text-blue-600 hover:underline mt-1 inline-block">+ Add a delivery address</Link>
              </div>
            )}
          </div>

          {/* Order Items — UNCHANGED ────────────────────────────────────────── */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Order Items ({checkoutItems.length})
            </h2>
            <div className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                  <img src={item.image_url} alt={item.title} className="w-16 h-16 object-contain bg-gray-50 p-2 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-1">${item.product_price} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold flex-shrink-0">${(item.product_price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method ─────────────────────────────────────────────────── */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Payment Method
            </h2>

            <div className="space-y-3">

              {/* Card option */}
              <label className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === "card" ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="radio" name="payment" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="flex-shrink-0" />
                <CreditCard className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Credit / Debit Card</p>
                  <p className="text-xs text-gray-500">Visa, Mastercard, Amex — powered by Stripe</p>
                </div>
                {/* Mini card brand badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="h-6 px-1.5 bg-[#1A1F71] rounded text-white text-[9px] font-black flex items-center tracking-wide">VISA</div>
                  <div className="relative h-6 w-9 flex-shrink-0">
                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-[#EB001B] opacity-90" />
                    <div className="absolute left-2.5 top-0.5 w-5 h-5 rounded-full bg-[#F79E1B] opacity-90" />
                  </div>
                  <div className="flex items-center gap-1 bg-[#635BFF] text-white rounded px-1.5 h-6">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-wide">STRIPE</span>
                  </div>
                </div>
              </label>

              {/* Inline Stripe card form — only shown when card is selected */}
              {paymentMethod === "card" && (
                <div className="border border-gray-200 rounded-xl px-5 py-4 bg-white">
                  <StripeCardForm onReady={setCardComplete} />
                </div>
              )}

              {/* COD option */}
              <label className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="flex-shrink-0" />
                <span className="text-lg flex-shrink-0">💵</span>
                <div>
                  <p className="font-semibold text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500">Pay with cash when your order arrives</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — ORDER SUMMARY ────────────────────────────────── */}
        <div>
          <div className="bg-white border rounded-xl p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>

            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal ({checkoutItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                  {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              {shipping > 0 && <p className="text-xs text-gray-400">Free shipping on orders above $50</p>}
              <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Error */}
            {orderError && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{orderError}</p>
              </div>
            )}

            {/* Stripe loading indicator */}
            {paymentMethod === "card" && !stripe && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />
                Loading payment system...
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isButtonDisabled}
              className="w-full mt-6 bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {buttonLabel}
                </>
              ) : (
                <>
                  {paymentMethod === "card" && <Lock className="w-4 h-4" />}
                  {buttonLabel}
                </>
              )}
            </button>

            {paymentMethod === "card" ? (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-400">256-bit SSL encryption · PCI DSS compliant</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center mt-3">
                By placing your order, you agree to our Terms & Conditions
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Back — UNCHANGED */}
      <div className="mt-8">
        <Link to={isBuyNow ? "/" : "/cart"} className="text-gray-600 hover:underline">
          ← {isBuyNow ? "Back to Shopping" : "Back to Cart"}
        </Link>
      </div>
    </div>
  );
}

// ─── Default export: wrap with <Elements> so hooks are available ──────────────
export default function Checkout() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutInner />
    </Elements>
  );
}
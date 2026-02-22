// src/components/ProductDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft, ShoppingCart, Star, Package, Truck,
  Pencil, Trash2, CheckCircle, AlertCircle, MessageSquarePlus,
  X, ChevronDown, ChevronUp,
} from "lucide-react";
import Toast from "./Toast";
import {
  getProductById,
  getProductReviews,
  getProductReviewStats,
  createReview,
  updateReview,
  deleteReview,
  checkUserReview,   // GET /api/products/:productId/reviews/check
} from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── StarRow ─── read-only star display ────────────────────────────────────────
function StarRow({ rating, size = "sm" }) {
  const dim = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${dim} ${
            s <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ── StarPicker ─── interactive star selector for review form ──────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500 font-medium">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ── RatingBar ─── single horizontal distribution bar ─────────────────────────
function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
    </div>
  );
}

// ── ReviewForm ─── used for both create and edit ──────────────────────────────
function ReviewForm({ initial, onSubmit, onCancel, submitting, error }) {
  const [rating,  setRating]  = useState(initial?.rating  ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const isEdit = !!initial?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ rating, comment });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <h3 className="font-bold text-gray-900 mb-4">
        {isEdit ? "Edit Your Review" : "Write a Review"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Rating *
          </label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Review
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Share your experience with this product..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none transition-shadow"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {comment.length} characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? isEdit ? "Saving..." : "Submitting..."
              : isEdit ? "Save Changes" : "Submit Review"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ReviewCard ─── single review display with edit/delete for owner ────────────
function ReviewCard({ review, isOwn, onEdit, onDelete, deleting }) {
      const name =
      (review.reviewer_name ??
        `${review.first_name ?? ""} ${review.last_name ?? ""}`.trim()) ||
      "Anonymous";

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`py-6 border-b border-gray-100 last:border-0 ${isOwn ? "bg-yellow-50/40 -mx-6 px-6 rounded-xl" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isOwn ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
          }`}>
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{name}</span>
              {isOwn && (
                <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">
                  Your review
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRow rating={review.rating} />
              <span className="text-xs text-gray-400">
                {new Date(review.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Actions */}
        {isOwn && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(review)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
              title="Edit review"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(review.id)}
              disabled={deleting}
              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Delete review"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {review.comment && (
        <p className="text-gray-600 mt-3 leading-relaxed text-sm pl-12">
          {review.comment}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews Section — self-contained with full CRUD
// ─────────────────────────────────────────────────────────────────────────────
function ReviewsSection({ productId, productRating, productReviewCount, isAuthenticated, user }) {
  const [reviews,     setReviews]     = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  // Form visibility
  const [showForm,    setShowForm]    = useState(false);
  const [editingReview, setEditingReview] = useState(null);  // null = create, object = edit

  // Submission state
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);

  // Delete state
  const [deletingId,  setDeletingId]  = useState(null);

  // Whether current user has already reviewed this product
  const [userReview,  setUserReview]  = useState(null);   // existing review or null
  const [canReview,   setCanReview]   = useState(false);  // has purchased

  // Pagination
  const [showAll,     setShowAll]     = useState(false);
  const PREVIEW_COUNT = 4;

  // ── Load reviews + stats + check user review ────────────────────────────────
  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        getProductReviews(productId).catch(() => []),
        getProductReviewStats(productId).catch(() => null),
      ]);

      const list = reviewsData?.reviews ?? reviewsData ?? [];
      setReviews(list);
      setStats(statsData);

      // Find current user's review in the list if logged in
      if (user?.id) {
        const mine = list.find((r) => r.user_id === user.id);
        setUserReview(mine ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [productId, user?.id]);

  // Check if logged-in user is eligible to review (has purchased)
  const checkCanReview = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      // GET /api/products/:productId/reviews/check
      // Returns: { can_review: true/false, has_reviewed: true/false }
      const data = await checkUserReview(productId);
      setCanReview(data?.can_review ?? false);
      // If backend says already reviewed but we don't have it yet, it'll be in the reviews list
    } catch {
      setCanReview(false);
    }
  }, [productId, isAuthenticated, user?.id]);

  useEffect(() => {
    loadReviews();
    checkCanReview();
  }, [loadReviews, checkCanReview]);

  // ── Show success briefly ────────────────────────────────────────────────────
  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Submit review (create or update) ───────────────────────────────────────
  const handleSubmit = async ({ rating, comment }) => {
    if (rating === 0) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (editingReview) {
        // PUT /api/products/:productId/reviews/:reviewId
        const updated = await updateReview(productId, editingReview.id, { rating, comment });
        setReviews((prev) =>
          prev.map((r) => (r.id === editingReview.id ? { ...r, ...updated, rating, comment } : r))
        );
        setUserReview((prev) => ({ ...prev, rating, comment }));
        flashSuccess("Your review has been updated.");
      } else {
        // POST /api/products/:productId/reviews
        const created = await createReview(productId, { rating, comment });
        const newReview = { ...created, rating, comment, user_id: user.id,
          first_name: user.first_name, last_name: user.last_name,
          created_at: created?.created_at ?? new Date().toISOString(),
        };
        setReviews((prev) => [newReview, ...prev]);
        setUserReview(newReview);
        flashSuccess("Your review has been posted. Thank you!");
      }

      setShowForm(false);
      setEditingReview(null);
    } catch (err) {
      setFormError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete review ───────────────────────────────────────────────────────────
  const handleDelete = async (reviewId) => {
    if (!window.confirm("Delete your review? This cannot be undone.")) return;
    setDeletingId(reviewId);
    try {
      // DELETE /api/products/:productId/reviews/:reviewId
      await deleteReview(productId, reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setUserReview(null);
      flashSuccess("Your review has been deleted.");
    } catch (err) {
      alert(err.message || "Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Open edit form ──────────────────────────────────────────────────────────
  const handleEdit = (review) => {
    setEditingReview(review);
    setFormError(null);
    setShowForm(true);
    // Scroll to form
    setTimeout(() =>
      document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "center" })
    , 50);
  };

  // ── Rating distribution from stats ─────────────────────────────────────────
  // Backend stats shape: { average_rating, review_count, distribution: { "5": 12, "4": 8, ... } }
  const distribution = stats?.distribution ?? stats?.rating_distribution ?? null;

  // Visible reviews (paginated)
  const visibleReviews = showAll ? reviews : reviews.slice(0, PREVIEW_COUNT);
  const hasMore        = reviews.length > PREVIEW_COUNT;

  const avgRating    = productRating ?? (stats?.average_rating ? parseFloat(stats.average_rating) : null);
  const totalReviews = productReviewCount ?? stats?.review_count ?? reviews.length;

  // ── Write Review CTA ────────────────────────────────────────────────────────
  const showWriteButton = isAuthenticated && canReview && !userReview && !showForm;
  const alreadyReviewed = !!userReview;

  return (
    <div className="mt-16" id="reviews">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Customer Reviews
          {totalReviews > 0 && (
            <span className="ml-2 text-lg font-normal text-gray-400">({totalReviews})</span>
          )}
        </h2>

        {/* CTA — write a review */}
        {showWriteButton && (
          <button
            onClick={() => { setEditingReview(null); setFormError(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Write a Review
          </button>
        )}

        {/* If not purchased */}
        {isAuthenticated && !canReview && !alreadyReviewed && (
          <span className="text-xs text-gray-400 italic">
            Purchase this product to leave a review
          </span>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Rating Summary ────────────────────────────────────────────────────── */}
      {avgRating !== null && totalReviews > 0 && (
        <div className="bg-gray-50 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-8">
          {/* Overall score */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-bold text-gray-900 leading-none">
              {avgRating.toFixed(1)}
            </div>
            <div className="flex justify-center mt-2">
              <StarRow rating={avgRating} size="md" />
            </div>
            <div className="text-sm text-gray-500 mt-1.5">
              {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </div>
          </div>

          {/* Distribution bars */}
            {distribution && (
              <div className="flex-1 w-full space-y-2 min-w-0">
                {[5, 4, 3, 2, 1].map((star) => {
                  // Get the raw data for this star level
                  const entry = distribution[star] ?? distribution[String(star)];
                  
                  // If entry is an object, get .count. Otherwise, use entry as the number or default to 0.
                  const actualCount = (entry && typeof entry === 'object') ? entry.count : (entry ?? 0);

                  return (
                    <RatingBar
                      key={star}
                      star={star}
                      count={actualCount}
                      total={totalReviews}
                    />
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* ── Write / Edit Form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div id="review-form" className="mb-8">
          <ReviewForm
            initial={editingReview}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingReview(null); setFormError(null); }}
            submitting={submitting}
            error={formError}
          />
        </div>
      )}

      {/* ── Login prompt ─────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            <Link to="/login" className="font-semibold text-gray-900 underline hover:no-underline">
              Sign in
            </Link>{" "}
            to write a review for this product.
          </p>
        </div>
      )}

      {/* ── Review List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-6 border-b border-gray-100 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/6" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mt-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <MessageSquarePlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {canReview
              ? "Be the first to share your experience!"
              : "Purchase this product to be the first to review it."}
          </p>
        </div>
      ) : (
        <>
          <div>
            {visibleReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwn={review.user_id === user?.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deleting={deletingId === review.id}
              />
            ))}
          </div>

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-6 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors mx-auto"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4" /> Show fewer reviews</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Show all {reviews.length} reviews</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ProductDetail Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToCart }                = useCart();
  const { user, isAuthenticated }    = useAuth();

  const [product,      setProduct]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [qty,          setQty]          = useState(1);
  const [toast,        setToast]        = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  // ── Load product ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Cart handlers ─────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await addToCart({ product_id: product.id, quantity: qty });
      setToast(`"${product.name}" added to cart!`);
    } catch {
      setToast("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/product/${id}` } } });
      return;
    }
    navigate("/checkout", {
      state: { mode: "buyNow", items: [{ ...product, quantity: qty }] },
    });
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
          <div className="bg-gray-100 rounded-xl h-96" />
          <div className="space-y-4 py-4">
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-10 bg-gray-100 rounded w-1/3" />
            <div className="h-20 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Product not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to home
        </Link>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const price          = parseFloat(product.price ?? 0);
  const formattedPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  const rating         = product.average_rating ? parseFloat(product.average_rating) : null;
  const reviewCount    = product.review_count ?? 0;
  const inStock        = (product.stock_quantity ?? 0) > 0;
  const stockWarning   = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const maxQty         = product.stock_quantity ?? 99;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        {product.category_name && (
          <>
            <span>/</span>
            <Link
              to={`/category/${product.category_slug}`}
              className="capitalize hover:text-gray-900 transition-colors"
            >
              {product.category_name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-700 truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* ── Image ──────────────────────────────────────────────────── */}
        <div className="bg-white p-8 rounded-xl border border-gray-100 relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-96 object-contain"
          />
          {!inStock && (
            <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
              <span className="bg-white border border-gray-200 text-gray-500 font-semibold px-4 py-2 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── Details ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {product.category_name && (
            <Link to={`/category/${product.category_slug}`}>
              <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 capitalize hover:bg-gray-200 transition-colors">
                {product.category_name}
              </span>
            </Link>
          )}

          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Rating summary — links down to reviews */}
          {rating !== null ? (
            <a href="#reviews" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <StarRow rating={rating} size="md" />
              <span className="font-medium text-gray-800">{rating.toFixed(1)}</span>
              <span className="text-gray-500 text-sm underline">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </a>
          ) : (
            <a href="#reviews" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              No reviews yet — be the first!
            </a>
          )}

          <div className="text-4xl font-bold text-gray-900">{formattedPrice}</div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-gray-400" />
            {inStock ? (
              <span className={stockWarning ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                {stockWarning ? `Only ${product.stock_quantity} left!` : "In Stock"}
              </span>
            ) : (
              <span className="text-red-500 font-medium">Out of Stock</span>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>

          {/* Quantity Selector */}
          {inStock && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Qty:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="px-4 py-2 text-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  −
                </button>
                <span className="px-5 py-2 font-bold border-x border-gray-300">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  className="px-4 py-2 text-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock || addingToCart}
              className="flex-1 border-2 border-black py-4 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-gray-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className="flex-1 bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Buy Now
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Truck className="w-4 h-4" />
            <span>Free shipping on orders over $50</span>
          </div>
        </div>
      </div>

      {/* ── Reviews Section ───────────────────────────────────────────────── */}
      <ReviewsSection
        productId={id}
        productRating={rating}
        productReviewCount={reviewCount}
        isAuthenticated={isAuthenticated}
        user={user}
      />
    </div>
  );
}
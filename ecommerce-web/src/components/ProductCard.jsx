// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";

// Backend product shape:
// {
//   id, name, description, price (decimal string e.g. "29.99"),
//   image_url, stock_quantity, is_active,
//   average_rating (null or "4.50"), review_count (number),
//   category_name, category_slug
// }

export default function ProductCard({ product, onAddToCart }) {
  const price = parseFloat(product.price ?? 0);
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  const rating      = product.average_rating ? parseFloat(product.average_rating) : null;
  const reviewCount = product.review_count ?? 0;
  const inStock     = (product.stock_quantity ?? 0) > 0;

  return (
    <div className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">

      {/* Product Image */}
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 block"
      >
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
        />

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      <div className="mt-4 flex flex-col flex-grow">
        {/* Category */}
        {product.category_name && (
          <span className="text-xs text-gray-400 capitalize mb-1">
            {product.category_name}
          </span>
        )}

        {/* Title */}
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-700 line-clamp-2 h-10 hover:text-gray-900 leading-5">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <p className="mt-2 text-lg font-bold text-gray-900">{formattedPrice}</p>

        {/* Rating — shows stars + count if reviews exist */}
        {rating !== null ? (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= Math.round(rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 font-medium ml-0.5">
              {rating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>
        ) : (
          // Spacer keeps card heights consistent when no reviews
          <div className="mt-1 h-5 flex items-center">
            <span className="text-xs text-gray-300">No reviews yet</span>
          </div>
        )}
      </div>

      {/* Add to Cart */}
      <button
        onClick={() => onAddToCart(product)}
        disabled={!inStock}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="w-4 h-4" />
        {inStock ? "Add to Cart" : "Out of Stock"}
      </button>
    </div>
  );
}
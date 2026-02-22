import ProductCard from "./ProductCard";

// Skeleton card shown while loading
function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col animate-pulse">
      <div className="aspect-square rounded-lg bg-gray-200" />
      <div className="mt-4 flex flex-col flex-grow gap-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/3 mt-1" />
      </div>
      <div className="mt-4 h-10 bg-gray-200 rounded-lg" />
    </div>
  );
}

export default function ProductGrid({ products, onAddToCart, loading = false }) {
  // Loading state — show 8 skeleton cards
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">
          No products found. Try a different search or category!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
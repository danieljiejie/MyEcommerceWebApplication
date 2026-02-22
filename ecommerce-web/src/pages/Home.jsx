import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import CategoryFilter from "../components/CategoryFilter";
import PriceFilter from "../components/PriceFilter";
import ProductGrid from "../components/ProductGrid";
import Toast from "../components/Toast";
import { getProducts, getCategories } from "../services/api";
import { X } from "lucide-react";

export default function Home({ search }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState({ min_price: undefined, max_price: undefined });
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const { addToCart } = useCart();
  const abortRef = useRef(null);

  // ── 1. Load categories once on mount ──────────────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(Array.isArray(data) ? data : (data.categories ?? []));
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setIsCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  // ── 2. Load products when filters change ──────────────────────────────────
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    async function loadProducts() {
      setIsProductsLoading(true);
      setError(null);
      try {
        // Build filters object — only include defined values
        const filters = {
          // Category filter
          ...(selectedCategory !== "all" && { category_id: selectedCategory }),
          // Search query
          ...(search?.trim() && { search: search.trim() }),
          // Price range
          ...(priceFilter.min_price && { min_price: priceFilter.min_price }),
          ...(priceFilter.max_price && { max_price: priceFilter.max_price }),
        };

        const data = await getProducts(filters);
        setProducts(Array.isArray(data) ? data : (data.products ?? []));
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load products:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsProductsLoading(false);
      }
    }

    loadProducts();
    return () => abortRef.current?.abort();
  }, [selectedCategory, search, priceFilter]);

  // ── 3. Handlers ───────────────────────────────────────────────────────────
  const handleCategorySelect = useCallback((id) => {
    setSelectedCategory(id);
  }, []);

  const handlePriceFilterChange = useCallback((newPriceFilter) => {
    setPriceFilter(newPriceFilter);
  }, []);

  const handleAddToCart = useCallback(
    async (product) => {
      try {
        await addToCart({ product_id: product.id, quantity: 1 });
        setToast(`"${product.name}" added to cart!`);
      } catch {
        setToast("Failed to add to cart. Please try again.");
      }
    },
    [addToCart]
  );

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategory("all");
    setPriceFilter({ min_price: undefined, max_price: undefined });
  }, []);

  // ── 4. Derived values ─────────────────────────────────────────────────────
  const selectedLabel = useMemo(() => {
    if (selectedCategory === "all") return "All Products";
    return categories.find((c) => c.id === selectedCategory)?.name ?? "Products";
  }, [selectedCategory, categories]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== "all" ||
      priceFilter.min_price !== undefined ||
      priceFilter.max_price !== undefined
    );
  }, [selectedCategory, priceFilter]);

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          onClick={handleClearAllFilters}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
            isLoading={isCategoriesLoading}
          />

          <PriceFilter
            minPrice={priceFilter.min_price}
            maxPrice={priceFilter.max_price}
            onFilterChange={handlePriceFilterChange}
          />

          {/* Clear all filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">{selectedLabel}</h2>
            <p className="text-gray-500 mt-1">
              {isProductsLoading
                ? "Loading..."
                : `${products.length} result${products.length === 1 ? "" : "s"}`}
            </p>

            {/* Active filters indicator */}
            {hasActiveFilters && !isProductsLoading && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedCategory !== "all" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Category: {selectedLabel}
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="ml-1 hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priceFilter.min_price && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Min: ${priceFilter.min_price}
                    <button
                      onClick={() =>
                        setPriceFilter((prev) => ({ ...prev, min_price: undefined }))
                      }
                      className="ml-1 hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priceFilter.max_price && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Max: ${priceFilter.max_price}
                    <button
                      onClick={() =>
                        setPriceFilter((prev) => ({ ...prev, max_price: undefined }))
                      }
                      className="ml-1 hover:text-gray-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Products grid */}
          {isProductsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            </div>
          ) : (
            <ProductGrid products={products} onAddToCart={handleAddToCart} />
          )}
        </div>
      </div>
    </div>
  );
}
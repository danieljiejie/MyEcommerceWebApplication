import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";

export default function PriceFilter({ minPrice, maxPrice, onFilterChange }) {
  const [localMin, setLocalMin] = useState(minPrice || "");
  const [localMax, setLocalMax] = useState(maxPrice || "");

  // Sync with parent when props change (e.g. reset button clicked)
  useEffect(() => {
    setLocalMin(minPrice || "");
    setLocalMax(maxPrice || "");
  }, [minPrice, maxPrice]);

  const handleApply = () => {
    const min = localMin ? parseFloat(localMin) : undefined;
    const max = localMax ? parseFloat(localMax) : undefined;

    // Validate that min <= max
    if (min && max && min > max) {
      alert("Minimum price cannot be greater than maximum price");
      return;
    }

    onFilterChange({ min_price: min, max_price: max });
  };

  const handleClear = () => {
    setLocalMin("");
    setLocalMax("");
    onFilterChange({ min_price: undefined, max_price: undefined });
  };

  const hasFilters = localMin || localMax;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Price Range</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Min Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Max Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Any"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApply}
            className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Apply
          </button>
          {hasFilters && (
            <button
              onClick={handleClear}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
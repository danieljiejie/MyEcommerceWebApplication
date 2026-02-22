import { memo } from "react";

const CategoryButton = ({ label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap w-full text-left px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-between gap-2 ${
      isActive
        ? "bg-black text-white shadow-md"
        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    }`}
  >
    <span className="truncate capitalize">{label}</span>
    {count !== undefined && count !== null && (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          isActive ? "bg-white/20 text-white" : "bg-gray-300 text-gray-600"
        }`}
      >
        {parseInt(count, 10)}
      </span>
    )}
  </button>
);

const CategoryFilter = memo(({ categories, selected, onSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold text-lg mb-3 text-gray-900">Categories</h3>

      <ul className="space-y-2">
        {/* "All" always first */}
        <li>
          <CategoryButton
            label="All Products"
            isActive={selected === "all"}
            onClick={() => onSelect("all")}
          />
        </li>

        {categories.map((cat) => (
          <li key={cat.id}>
            <CategoryButton
              label={cat.name}
              count={cat.product_count}
              isActive={selected === cat.id}
              onClick={() => onSelect(cat.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});

export default CategoryFilter;
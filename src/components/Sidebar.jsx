import { useState, useEffect } from "react";
import RangeField from "./RangeField";

const defaultFilters = {
  categories: { cafe: true, restaurant: true },
  calories: { min: "", max: "" },
};

export default function Sidebar({ value, onChange, onSearch }) {
  const [filters, setFilters] = useState(value ?? defaultFilters);

  useEffect(() => {
    if (value) setFilters(value);
  }, [value]);

  const update = (next) => {
    setFilters(next);
    onChange?.(next);
  };

  const toggleCategory = (key) => {
    update({
      ...filters,
      categories: { ...filters.categories, [key]: !filters.categories[key] },
    });
  };

  // const updateRange = (field, val) => {
  //   update({ ...filters, calories: { ...filters.calories, [field]: val } });
  // };

  return (
    <aside
      className="
        w-58 shrink-0 border-r border-gray-200 bg-gray-50
        p-4 sticky top-12 h-[calc(100vh-48px)] overflow-y-auto
      "
    >
      {/* 카테고리 */}
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">카테고리</div>
        <label className="flex items-center gap-2 mb-2 text-sm">
          <input
            type="checkbox"
            checked={!!filters.categories.restaurant}
            onChange={() => toggleCategory("restaurant")}
            className="accent-black"
          />
          음식점
        </label>
        <label className="flex items-center gap-2 mb-2 text-sm">
          <input
            type="checkbox"
            checked={!!filters.categories.cafe}
            onChange={() => toggleCategory("cafe")}
            className="accent-black"
          />
          카페
        </label>
      </div>

      {/* 영양성분 필드 */}
      <RangeField
        label="칼로리"
        value={filters.calories}
        onChange={(v) => update({ ...filters, calories: v })}
        widthClass="w-24"
      />
      <RangeField
        label="단백질"
        value={filters.protein}
        onChange={(v) => update({ ...filters, protein: v })}
        widthClass="w-24"
      />
      <RangeField
        label="지방"
        value={filters.fat}
        onChange={(v) => update({ ...filters, fat: v })}
        widthClass="w-24"
      />
      <RangeField
        label="탄수화물"
        value={filters.carb}
        onChange={(v) => update({ ...filters, carb: v })}
        widthClass="w-24"
      />

      {/* 검색 */}
      <button
        onClick={() => onSearch?.(filters)}
        className="w-full rounded bg-black text-white py-2 text-sm font-semibold hover:bg-black/90 transition-colors"
      >
        검색
      </button>
    </aside>
  );
}

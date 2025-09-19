// src/components/Sidebar.jsx
import { useState } from "react";

const defaultFilters = {
  categories: { cafe: true, restaurant: true },
  calories: { min: "", max: "" },
  protein: { min: "", max: "" },
  fat: { min: "", max: "" },
  carb: { min: "", max: "" },
};

export default function Sidebar({ setSearchParams }) {
  const [filters, setFilters] = useState(defaultFilters);

  const toggleCategory = (key) =>
    setFilters((d) => ({
      ...d,
      categories: { ...d.categories, [key]: !d.categories[key] },
    }));

  const setRange = (key, field, val) =>
    setFilters((d) => ({ ...d, [key]: { ...d[key], [field]: val } }));

  return (
    <aside className="w-58 shrink-0 border-r border-gray-200 bg-gray-50 p-4 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto">
      {/* 카테고리 (간단버전) */}
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">카테고리</div>
        {[
          { key: "cafe", label: "카페" },
          { key: "restaurant", label: "음식점" },
        ].map((c) => (
          <label key={c.key} className="block mb-1">
            <input
              type="checkbox"
              className="mr-2"
              checked={!!filters.categories[c.key]}
              onChange={() => toggleCategory(c.key)}
            />
            {c.label}
          </label>
        ))}
      </div>

      {/* 매크로(칼로리/단백질/지방/탄수) */}
      {[
        { key: "calories", label: "칼로리" },
        { key: "protein", label: "단백질" },
        { key: "fat", label: "지방" },
        { key: "carb", label: "탄수화물" },
      ].map((m) => (
        <div key={m.key} className="mb-4">
          <div className="text-sm font-semibold mb-2">{m.label}</div>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              placeholder="최소"
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              value={filters[m.key].min}
              onChange={(e) => setRange(m.key, "min", e.target.value)}
            />
            <input
              inputMode="numeric"
              placeholder="최대"
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              value={filters[m.key].max}
              onChange={(e) => setRange(m.key, "max", e.target.value)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          console.log("[Sidebar] search click →", filters);
          setSearchParams(filters);
        }}
        className="w-full mt-2 rounded px-3 py-2 bg-black text-white font-semibold hover:bg-gray-800 active:scale-[0.99] transition"
      >
        검색
      </button>
    </aside>
  );
}

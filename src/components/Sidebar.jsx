// src/components/Sidebar.jsx
import { useState, useEffect } from "react";

const defaultFilters = {
  categories: { cafe: true, restaurant: true },
  calories: { min: "", max: "" },
  protein: { min: "", max: "" },
  fat: { min: "", max: "" },
  carb: { min: "", max: "" },
};

export default function Sidebar({ setSearchParams }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [isOpen, setIsOpen] = useState(true);

  const toggleCategory = (key) =>
    setFilters((d) => ({
      ...d,
      categories: { ...d.categories, [key]: !d.categories[key] },
    }));

  const setRange = (key, field, val) =>
    setFilters((d) => ({ ...d, [key]: { ...d[key], [field]: val } }));

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-3 top-[64px] z-50 bg-black text-white px-3 py-2 rounded shadow hover:bg-gray-800"
          aria-label="사이드바 열기"
        >
          필터 열기
        </button>
      )}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 top-[56px] bg-black/30 z-[9998]"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-[56px] bottom-0 bg-gray-50 border-r border-gray-200 p-4 w-60 transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ zIndex: 9999 }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-bold">필터</div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-600 hover:text-black px-2 py-1 rounded"
            aria-label="사이드바 닫기"
          >
            ✕
          </button>
        </div>
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
        <div className="mt-3">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full rounded px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>
      </aside>
    </>
  );
}

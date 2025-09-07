// src/components/RangeField.jsx
export default function RangeField({
  label,
  value,
  onChange,
  widthClass = "w-24",
}) {
  const safe = value ?? { min: "", max: "" };

  return (
    <div className="mb-3">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          placeholder="최소"
          value={safe.min}
          onChange={(e) => onChange({ ...value, min: e.target.value })}
          className={`${widthClass} rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/20`}
        />
        <input
          inputMode="numeric"
          placeholder="최대"
          value={safe.max}
          onChange={(e) => onChange({ ...value, max: e.target.value })}
          className={`${widthClass} rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/20`}
        />
      </div>
    </div>
  );
}

"use client";

import { INDEX_TYPES, INDEX_TYPE_KEYS, type IndexTypeKey } from "@/lib/index-types";

export default function IndexTypeSelector({
  value,
  onChange,
  disabled,
  id,
}: {
  value: IndexTypeKey;
  onChange: (key: IndexTypeKey) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400" htmlFor={id}>
      <span className="hidden sm:inline">Endeks:</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as IndexTypeKey)}
        title={INDEX_TYPES[value].description}
        className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-bold text-zinc-100 shadow-sm outline-none transition hover:border-sky-500/60 focus:border-sky-500 disabled:opacity-50"
      >
        {INDEX_TYPE_KEYS.map((k) => (
          <option key={k} value={k}>
            {INDEX_TYPES[k].label}
          </option>
        ))}
      </select>
    </label>
  );
}

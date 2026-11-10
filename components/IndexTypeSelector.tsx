"use client";

import { INDEX_TYPES, INDEX_TYPE_KEYS, type IndexTypeKey } from "@/lib/index-types";

export default function IndexTypeSelector({
  value,
  onChange,
  disabled,
  id,
  showDescription = true,
}: {
  value: IndexTypeKey;
  onChange: (key: IndexTypeKey) => void;
  disabled?: boolean;
  id: string;
  showDescription?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400" htmlFor={id}>
        <span><span className="hidden sm:inline">Varsayılan </span>Endeks Kapsamı:</span>
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as IndexTypeKey)}
          title="Varsayılan Endeks Kapsamı: Tarama ve tabloda varsayılan hisse listesi (endeks-tip.md)"
          className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold text-zinc-100 shadow-sm outline-none transition hover:border-sky-500/60 focus:border-sky-500 disabled:opacity-50"
        >
          {INDEX_TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {INDEX_TYPES[k].label}
            </option>
          ))}
        </select>
      </label>
      {showDescription && (
        <span className="text-[10px] text-zinc-500 font-normal hidden sm:block">
          Tarama ve tabloda varsayılan hisse listesi
        </span>
      )}
    </div>
  );
}

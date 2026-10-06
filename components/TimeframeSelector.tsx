"use client";

import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";

export interface TimeframeOption {
  key: TimeframeKey;
  label: string;
  badge: string;
  desc: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { key: "5m", label: "5 Dakikalık", badge: "5dk", desc: "Scalping ve anlık gün içi sinyaller" },
  { key: "10m", label: "10 Dakikalık", badge: "10dk", desc: "Hızlı gün içi momentum ve salınım" },
  { key: "15m", label: "15 Dakikalık", badge: "15dk", desc: "Standart gün içi trend takibi" },
  { key: "30m", label: "30 Dakikalık", badge: "30dk", desc: "Dengeli gün içi yön ve destek/direnç" },
  { key: "1h", label: "1 Saatlik", badge: "1S", desc: "Kısa vadeli saatlik trend" },
  { key: "2h", label: "2 Saatlik", badge: "2S", desc: "Kısa-orta vadeli salınım" },
  { key: "4h", label: "4 Saatlik", badge: "4S", desc: "Gün içi ana salınım ve yön" },
  { key: "1d", label: "Günlük", badge: "Günlük", desc: "Standart seans kapanış analizi" },
  { key: "1wk", label: "Haftalık", badge: "1H", desc: "Orta-uzun vadeli trend" },
  { key: "1mo", label: "Aylık", badge: "1A", desc: "Makro ve uzun vadeli döngü" },
];

interface TimeframeSelectorProps {
  value: TimeframeKey;
  onChange: (tf: TimeframeKey) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

export default function TimeframeSelector({
  value,
  onChange,
  disabled = false,
  size = "md",
  label = "Periyot",
}: TimeframeSelectorProps) {
  const isSm = size === "sm";

  return (
    <div className="inline-flex max-w-full items-center gap-1.5">
      {label && (
        <span className="hidden sm:inline-block shrink-0 text-[11px] font-medium text-zinc-400">
          {label}:
        </span>
      )}
      <div
        className={`inline-flex max-w-full items-center overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/90 p-0.5 shadow-inner scrollbar-none ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
        role="group"
        aria-label="Periyot seçimi"
      >
        {TIMEFRAME_OPTIONS.map((opt) => {
          const isActive = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              title={`${opt.label} — ${opt.desc}`}
              className={`relative shrink-0 rounded-lg font-medium transition-all ${
                isSm
                  ? "px-1.5 py-1 text-[11px]"
                  : "px-2 py-1 text-xs"
              } ${
                isActive
                  ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <span>{opt.badge}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

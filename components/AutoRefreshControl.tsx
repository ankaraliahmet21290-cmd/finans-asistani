"use client";

import { useEffect, useState, useRef } from "react";

export type RefreshInterval = 0 | 15 | 30 | 60 | 120 | 300;

export const REFRESH_INTERVAL_OPTIONS: Array<{ value: RefreshInterval; label: string; desc: string }> = [
  { value: 15, label: "15 sn", desc: "Çok Hızlı (Gün içi anlık)" },
  { value: 30, label: "30 sn", desc: "Önerilen (Hızlı & Dengeli)" },
  { value: 60, label: "1 dk", desc: "Standart Akış" },
  { value: 120, label: "2 dk", desc: "Düşük Trafik" },
  { value: 300, label: "5 dk", desc: "Tasarruflu" },
  { value: 0, label: "Kapalı", desc: "Yalnızca Elle Yenileme" },
];

interface AutoRefreshControlProps {
  intervalSeconds: RefreshInterval;
  onIntervalChange: (seconds: RefreshInterval) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: string | null;
  storageKey?: string;
  size?: "sm" | "md";
}

export default function AutoRefreshControl({
  intervalSeconds,
  onIntervalChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
  storageKey,
  size = "md",
}: AutoRefreshControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [remaining, setRemaining] = useState<number>(intervalSeconds);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (intervalSeconds === 0) {
      setRemaining(0);
      return;
    }

    setRemaining(intervalSeconds);
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds, isRefreshing]);

  // When interval changes, optionally persist to localStorage
  const handleSelect = (val: RefreshInterval) => {
    onIntervalChange(val);
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, String(val));
      } catch {
        // ignore
      }
    }
    setIsOpen(false);
  };

  const currentOption =
    REFRESH_INTERVAL_OPTIONS.find((o) => o.value === intervalSeconds) ?? REFRESH_INTERVAL_OPTIONS[1];

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={menuRef}>
      {/* Interval Selector Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-zinc-100 ${
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
          }`}
          title="Yenileme sıklığını ayarla"
        >
          {intervalSeconds > 0 ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
          )}

          <span className="text-zinc-400 font-normal">Yenileme:</span>
          <span className="font-semibold text-zinc-200">{currentOption.label}</span>

          {intervalSeconds > 0 && (
            <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
              ({remaining}s)
            </span>
          )}

          <svg
            className={`h-3 w-3 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80 mb-1">
              Veri Yenileme Sıklığı
            </div>

            <div className="space-y-0.5">
              {REFRESH_INTERVAL_OPTIONS.map((opt) => {
                const isSelected = opt.value === intervalSeconds;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? "bg-sky-500/15 font-bold text-sky-300 border border-sky-500/30"
                        : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        {opt.value === 30 && (
                          <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[9px] font-mono text-sky-400">
                            Önerilen
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-normal text-zinc-500">{opt.desc}</div>
                    </div>
                    {isSelected && (
                      <span className="text-sky-400 text-xs font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manual Refresh Button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Şimdi Yenile"
        className={`group flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50 ${
          size === "sm" ? "h-7 w-7" : "h-8 w-8"
        }`}
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${
            isRefreshing ? "animate-spin text-sky-400" : "group-hover:rotate-180 duration-500"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {lastUpdated && (
        <span className="hidden md:inline-block font-mono text-[11px] text-zinc-500">
          {new Date(lastUpdated).toLocaleTimeString("tr-TR")}
        </span>
      )}
    </div>
  );
}

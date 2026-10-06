"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchBistCompanies } from "@/lib/bist";
import type { AssetType } from "@/lib/types";

interface WatchlistComboboxProps {
  onAdd: (ticker: string, type: AssetType, name?: string) => Promise<boolean | void>;
  existingTickers: string[];
  disabled?: boolean;
}

export default function WatchlistCombobox({
  onAdd,
  existingTickers,
  disabled = false,
}: WatchlistComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [addingTicker, setAddingTicker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // Normalize existing tickers set for case-insensitive lookup
  const existingSet = useMemo(() => {
    const s = new Set<string>();
    for (const t of existingTickers) {
      s.add(t.toUpperCase());
      s.add(t.toUpperCase().replace(/\.IS$/, ""));
    }
    return s;
  }, [existingTickers]);

  // Search results
  const bistResults = useMemo(() => {
    return searchBistCompanies(query, 25);
  }, [query]);

  // Clean custom ticker interpretation
  const customCandidate = useMemo(() => {
    const clean = query.trim().toUpperCase();
    if (!clean) return null;

    // Check if it's already an exact code in bistResults
    const exactBist = bistResults.find(
      (b) => b.code.toUpperCase() === clean || b.ticker.toUpperCase() === clean
    );
    if (exactBist) return null;

    const isGold = clean.includes("GC=F") || clean === "ALTIN" || clean === "GOLD";
    const type: AssetType = isGold ? "gold" : "stock";
    const ticker = isGold ? (clean === "ALTIN" || clean === "GOLD" ? "GC=F" : clean) : clean;
    const name = isGold ? "Ons Altın Vadeli" : `${clean} (Özel Sembol)`;

    return { ticker, type, name, isExisting: existingSet.has(ticker) };
  }, [query, bistResults, existingSet]);

  // Total selectable items count for keyboard navigation
  const totalItemsCount = bistResults.length + (customCandidate ? 1 : 0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = async (ticker: string, type: AssetType, name?: string) => {
    if (existingSet.has(ticker.toUpperCase())) return;
    setAddingTicker(ticker);
    try {
      const ok = await onAdd(ticker, type, name);
      if (ok !== false) {
        setQuery("");
        setIsOpen(false);
        setActiveIndex(-1);
      }
    } finally {
      setAddingTicker(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItemsCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItemsCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < bistResults.length) {
        const item = bistResults[activeIndex];
        void handleSelectItem(item.ticker, "stock", item.name);
      } else if (customCandidate && activeIndex === bistResults.length) {
        void handleSelectItem(customCandidate.ticker, customCandidate.type, customCandidate.name);
      } else if (customCandidate && bistResults.length === 0) {
        void handleSelectItem(customCandidate.ticker, customCandidate.type, customCandidate.name);
      } else if (bistResults.length > 0) {
        const first = bistResults[0];
        void handleSelectItem(first.ticker, "stock", first.name);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg" id={`watchlist-combobox-${id}`}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <span className="pointer-events-none absolute left-3 text-zinc-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled || addingTicker !== null}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Listeye hisse ekle (örn: GARAN, THYAO, AAPL, GC=F...)"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 py-2 pl-9 pr-20 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 shadow-inner transition focus:border-sky-500 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
        />

        {/* Action button inside input */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="rounded p-1 text-zinc-400 hover:text-zinc-200"
              title="Temizle"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : null}

          {addingTicker ? (
            <span className="flex items-center gap-1 rounded-lg bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-300">
              <span className="h-2 w-2 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              Ekleniyor
            </span>
          ) : (
            <span className="hidden sm:inline-block rounded border border-zinc-700/80 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">
              ↵ Ekle
            </span>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80 mb-1">
            <span>{query.trim() ? `Sonuçlar (${bistResults.length})` : "Önerilen BIST Hisseleri"}</span>
            <span className="text-[10px] text-zinc-500 font-normal">watchlist.md dosyasına eklenir</span>
          </div>

          <ul ref={listRef} className="space-y-0.5">
            {/* Custom Candidate option if query doesn't match standard or is custom */}
            {customCandidate && (
              <li
                onClick={() =>
                  !customCandidate.isExisting &&
                  handleSelectItem(customCandidate.ticker, customCandidate.type, customCandidate.name)
                }
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                  customCandidate.isExisting
                    ? "opacity-50 cursor-not-allowed bg-zinc-900/40 text-zinc-500"
                    : activeIndex === bistResults.length
                    ? "bg-sky-600/20 text-sky-100"
                    : "text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                    ÖZEL
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-zinc-100">{customCandidate.ticker}</span>
                    <span className="ml-1 text-[11px] text-zinc-400">
                      {customCandidate.type === "gold" ? "— Altın" : "— Hisse / Sembol"}
                    </span>
                  </div>
                </div>

                {customCandidate.isExisting ? (
                  <span className="text-[11px] text-zinc-500">Zaten Listede</span>
                ) : (
                  <span className="text-[11px] text-sky-400 font-medium">+ Listeye Ekle</span>
                )}
              </li>
            )}

            {/* BIST Search Results */}
            {bistResults.map((company, index) => {
              const isExisting =
                existingSet.has(company.ticker.toUpperCase()) ||
                existingSet.has(company.code.toUpperCase());
              const isActive = activeIndex === index;

              return (
                <li
                  key={company.ticker}
                  onClick={() => !isExisting && handleSelectItem(company.ticker, "stock", company.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isExisting
                      ? "opacity-50 cursor-not-allowed bg-zinc-900/30 text-zinc-500"
                      : isActive
                      ? "bg-sky-600/20 text-sky-100"
                      : "text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sky-300">
                      {company.code}
                    </span>
                    <span className="truncate text-zinc-300">{company.name}</span>
                  </div>

                  <div className="ml-2 flex shrink-0 items-center">
                    {isExisting ? (
                      <span className="text-[10px] text-zinc-500">Listede</span>
                    ) : (
                      <span className="text-[11px] font-medium text-sky-400 group-hover:text-sky-300">
                        + Ekle
                      </span>
                    )}
                  </div>
                </li>
              );
            })}

            {bistResults.length === 0 && !customCandidate && (
              <li className="px-3 py-6 text-center text-xs text-zinc-500">
                Eşleşen hisse bulunamadı. Tam sembol kodunu yazarak ekleyebilirsiniz.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

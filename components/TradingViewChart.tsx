"use client";

import { useMemo, useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import {
  toTradingViewSymbol,
  toTradingViewInterval,
  searchAllTradingViewAssets,
  POPULAR_TV_PRESETS,
  type TradingViewAssetItem,
} from "@/lib/tradingview";

interface TradingViewChartProps {
  ticker: string;
  type?: string;
  timeframe?: string;
  height?: number | string;
  allowSearch?: boolean;
  onSymbolChange?: (newTicker: string, newType?: string, newTvSymbol?: string) => void;
}

const TIMEFRAME_BUTTONS = [
  { key: "5m", label: "5D" },
  { key: "15m", label: "15D" },
  { key: "1h", label: "1S" },
  { key: "4h", label: "4S" },
  { key: "1d", label: "Günlük" },
  { key: "1wk", label: "Haftalık" },
  { key: "1mo", label: "Aylık" },
];

const CATEGORY_TABS = [
  { key: "all", label: "Tümü", icon: "🌐" },
  { key: "bist", label: "BIST", icon: "🇹🇷" },
  { key: "us_stock", label: "ABD Wall St", icon: "🇺🇸" },
  { key: "crypto", label: "Kripto", icon: "🪙" },
  { key: "commodity", label: "Emtia", icon: "🥇" },
  { key: "forex", label: "Döviz", icon: "💵" },
  { key: "index", label: "Endeks", icon: "📈" },
] as const;

function TradingViewChartComponent({
  ticker,
  type,
  timeframe = "1d",
  height = 560,
  allowSearch = true,
  onSymbolChange,
}: TradingViewChartProps) {
  const [currentTicker, setCurrentTicker] = useState(ticker);
  const [currentType, setCurrentType] = useState<string | undefined>(type);
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);

  // Search popover state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "all" | "bist" | "us_stock" | "crypto" | "commodity" | "forex" | "index"
  >("all");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when prop changes
  useEffect(() => {
    setCurrentTicker(ticker);
    setCurrentType(type);
  }, [ticker, type]);

  useEffect(() => {
    setCurrentTimeframe(timeframe);
  }, [timeframe]);

  // Focus search input on open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  // Close search popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSearchOpen]);

  const tvSymbol = toTradingViewSymbol(currentTicker, currentType);
  const tvInterval = toTradingViewInterval(currentTimeframe);

  // Modern TradingView Advanced Chart URL
  // CRITICAL FIX: Adding `tvwidgetsymbol` in the query string prevents TradingView's embed widget
  // from serving stale cached symbols from localStorage!
  const iframeSrc = useMemo(() => {
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Europe/Istanbul",
      theme: "dark",
      style: "1",
      locale: "tr",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      save_image: true,
      support_host: "https://www.tradingview.com",
    };
    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=tr&tvwidgetsymbol=${encodeURIComponent(
      tvSymbol
    )}#${encodeURIComponent(JSON.stringify(config))}`;
  }, [tvSymbol, tvInterval]);

  const externalUrl = `https://tr.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;

  // Filtered search items
  const searchResults = useMemo(() => {
    return searchAllTradingViewAssets(searchQuery, activeCategory, 18);
  }, [searchQuery, activeCategory]);

  const handleSelectAsset = (item: TradingViewAssetItem) => {
    setCurrentTicker(item.ticker);
    setCurrentType(item.category === "bist" ? "stock" : item.category);
    setIsSearchOpen(false);
    setSearchQuery("");

    if (onSymbolChange) {
      onSymbolChange(item.ticker, item.category === "bist" ? "stock" : item.category, item.symbol);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleSelectAsset(searchResults[0]);
    } else {
      const clean = searchQuery.trim().toUpperCase();
      const resolved = toTradingViewSymbol(clean);
      setCurrentTicker(clean);
      setIsSearchOpen(false);
      setSearchQuery("");
      if (onSymbolChange) {
        onSymbolChange(clean, undefined, resolved);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-visible rounded-2xl border border-zinc-800 bg-[#0a0a0f] shadow-2xl"
    >
      {/* Upper Main Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-800/80 px-4 py-2.5 bg-zinc-950/90 text-xs backdrop-blur-md">
        {/* Left: Current Active Symbol & Search Launcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-zinc-100 hidden sm:inline">TradingView Canlı Grafik</span>

          <div className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 font-mono text-xs font-bold text-sky-300">
            <span>{tvSymbol}</span>
          </div>

          {allowSearch && (
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 font-semibold text-indigo-300 transition hover:bg-indigo-500/25 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Varlık Değiştir / Ara</span>
              <kbd className="hidden sm:inline-block rounded bg-indigo-950/80 px-1.5 py-0.2 font-mono text-[10px] text-indigo-400 border border-indigo-800/60">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Right: Timeframe Buttons & External Links */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Timeframe quick switch */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
            {TIMEFRAME_BUTTONS.map((tf) => {
              const isActive = currentTimeframe === tf.key;
              return (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setCurrentTimeframe(tf.key)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-sky-500 text-white font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Finans Asistanı Internal Analysis Link */}
          <Link
            href={`/symbol/${encodeURIComponent(currentTicker)}`}
            className="hidden md:inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
            title="Bu varlığın temel ve teknik analiz skorlarını incele"
          >
            <span>📊 Finans Asistanı Analizi</span>
          </Link>

          {/* External TradingView.com button */}
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-sky-500/50 hover:text-sky-300 transition"
          >
            <span>TradingView&apos;de Aç</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Quick Category Chips Bar */}
      {allowSearch && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-800/60 bg-zinc-950/60 px-4 py-1.5 scrollbar-none text-[11px]">
          <span className="text-zinc-500 shrink-0 font-medium mr-1">Hızlı Erişim:</span>
          {POPULAR_TV_PRESETS.slice(0, 11).map((item) => {
            const isCurrent = tvSymbol === item.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleSelectAsset(item)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 font-medium transition active:scale-95 ${
                  isCurrent
                    ? "border border-sky-500/50 bg-sky-500/20 text-sky-200 font-bold"
                    : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.code}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Asset Search Popover Modal */}
      {isSearchOpen && (
        <div className="absolute left-2 right-2 top-12 z-50 rounded-2xl border border-sky-500/40 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl sm:left-4 sm:right-auto sm:w-[480px]">
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🔍</span>
                <h4 className="text-sm font-bold text-zinc-100">İstenilen Hisse / Varlığı Seçin</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kod veya ad yazın (THYAO, NVDA, BTC, Altın, USD/TRY, BIST:EREGL...)"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none ring-sky-500/50 transition focus:border-sky-500 focus:ring-2"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {CATEGORY_TABS.map((cat) => {
                const isSelected = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                      isSelected
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <span>{cat.icon} </span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Results List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelectAsset(item)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-left transition hover:border-sky-500/40 hover:bg-zinc-800/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{item.icon ?? "📈"}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-100">{item.code}</span>
                          <span className="font-mono text-[10px] text-sky-400">{item.symbol}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1">{item.name}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 border border-zinc-700/60">
                      {item.categoryLabel}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-zinc-400">
                  <p>Sonuç bulunamadı.</p>
                  {searchQuery && (
                    <button
                      type="submit"
                      className="mt-2 rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-500"
                    >
                      &quot;{searchQuery}&quot; sembolünü TradingView&apos;de Doğrudan Yükle →
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Clean, Isolated Iframe */}
      <iframe
        key={`${tvSymbol}-${tvInterval}`}
        src={iframeSrc}
        title={`TradingView Chart ${tvSymbol}`}
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          border: "none",
        }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export default memo(TradingViewChartComponent);

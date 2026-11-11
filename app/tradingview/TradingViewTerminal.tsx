"use client";

import { useState } from "react";
import Link from "next/link";
import TradingViewChart from "@/components/TradingViewChart";
import TradingViewTechnicalAnalysis from "@/components/TradingViewTechnicalAnalysis";
import {
  toTradingViewSymbol,
  POPULAR_TV_PRESETS,
  type TradingViewAssetItem,
} from "@/lib/tradingview";
import { resolveType } from "@/lib/watchlist";
import type { AssetType } from "@/lib/types";

interface TradingViewTerminalProps {
  initialSymbol?: string;
  initialTf?: string;
}

const MARKET_FILTER_TABS = [
  { key: "all", label: "Tüm Varlıklar", icon: "🌐" },
  { key: "bist", label: "Borsa İstanbul", icon: "🇹🇷" },
  { key: "us_stock", label: "Amerikan Borsası", icon: "🇺🇸" },
  { key: "crypto", label: "Kripto Para", icon: "🪙" },
  { key: "commodity", label: "Emtia & Döviz", icon: "🥇" },
  { key: "index", label: "Dünya Endeksleri", icon: "📈" },
] as const;

export default function TradingViewTerminal({
  initialSymbol = "THYAO.IS",
  initialTf = "1d",
}: TradingViewTerminalProps) {
  const [activeTicker, setActiveTicker] = useState<string>(initialSymbol);
  const [activeType, setActiveType] = useState<AssetType>(() => resolveType(initialSymbol));
  const [activeTf, setActiveTf] = useState<string>(initialTf);
  const [selectedMarketTab, setSelectedMarketTab] = useState<string>("all");

  const tvSymbol = toTradingViewSymbol(activeTicker, activeType);

  const filteredPresets = POPULAR_TV_PRESETS.filter((item) => {
    if (selectedMarketTab === "all") return true;
    if (selectedMarketTab === "commodity") return item.category === "commodity" || item.category === "forex";
    return item.category === selectedMarketTab;
  });

  const handleSelectPreset = (item: TradingViewAssetItem) => {
    setActiveTicker(item.ticker);
    setActiveType(item.category === "bist" ? "stock" : (item.category as AssetType));
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Hero Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-b from-sky-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8 shadow-xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canlı TradingView Karar İstasyonu · Tüm Piyasalar
          </div>

          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
                TradingView Canlı Terminali
              </h1>
              <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
                BIST hisseleri, ABD devleri (Nvidia, Apple, Tesla), Kripto, Ons &amp; Gram Altın ve Döviz kurlarını TradingView gelişmiş grafikleri ve çoklu teknik osilatör ibresiyle inceleyin.
              </p>
            </div>

            {/* Quick Link to Finans Asistanı internal AI report */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href={`/symbol/${encodeURIComponent(activeTicker)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 active:scale-95"
              >
                <span>📊 {activeTicker} Finans Asistanı Raporu</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Market Tab Selector */}
          <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/80 pt-4">
            <span className="text-xs text-zinc-500 font-medium mr-2">Piyasa Filtresi:</span>
            {MARKET_FILTER_TABS.map((tab) => {
              const isSelected = selectedMarketTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedMarketTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "border border-sky-500/50 bg-sky-500/20 text-sky-200 shadow-sm"
                      : "border border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick preset chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-2">Hızlı Seçim:</span>
            {filteredPresets.map((item) => {
              const isCurrent = tvSymbol === item.symbol;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(item)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                    isCurrent
                      ? "border border-sky-500 bg-sky-500/25 text-sky-200 font-bold shadow-sm"
                      : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Full-Featured TradingView Interactive Chart */}
      <section className="space-y-3">
        <TradingViewChart
          ticker={activeTicker}
          type={activeType}
          timeframe={activeTf}
          height={640}
          allowSearch={true}
          onSymbolChange={(newTicker, newType) => {
            setActiveTicker(newTicker);
            if (newType) setActiveType(newType as AssetType);
          }}
        />
      </section>

      {/* Lower Technical Analysis Section */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Left: TradingView Technical Analysis Gauge */}
        <TradingViewTechnicalAnalysis
          ticker={activeTicker}
          type={activeType}
          timeframe={activeTf}
          height={440}
        />

        {/* Right: Asset Overview & Fast Actions */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#0a0a0f] p-5 shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {activeTicker} Genel Görünüm
                  </h3>
                  <p className="text-xs text-zinc-400">
                    TradingView Sembolü: <span className="font-mono text-sky-400">{tvSymbol}</span>
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-sky-300 border border-sky-500/20">
                Canlı Entegrasyon
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm text-zinc-300">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Aktif Varlık:</span>
                  <strong className="text-zinc-100 font-mono text-sm">{activeTicker}</strong>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>TradingView Kodu:</span>
                  <strong className="text-sky-300 font-mono">{tvSymbol}</strong>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Piyasa Türü:</span>
                  <span className="text-zinc-200 capitalize">{activeType}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Yukarıdaki TradingView gelişmiş grafiği; Fibonacci düzeltmeleri, Trend çizgileri, RSI, MACD, Bollinger Bantları ve hacim profili dahil tüm resmi TradingView araçlarını destekler. Sol araç çubuğunu kullanarak çizim yapabilir, üst çubuktan gösterge ekleyebilirsiniz.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-zinc-800/80 pt-4">
            <Link
              href={`/symbol/${encodeURIComponent(activeTicker)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-sky-500 hover:to-indigo-500 active:scale-95"
            >
              <span>{activeTicker} Detaylı Analiz & Skor Motoruna Git →</span>
            </Link>
            <a
              href={`https://tr.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 active:scale-95"
            >
              <span>TradingView.com&apos;da Aç</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import PriceChart from "./PriceChart";
import SignalCard from "./SignalCard";
import SignalBadge from "./SignalBadge";
import { MacdChart, RsiChart } from "./IndicatorCharts";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";
import { formatNumber, formatPercent, formatPrice, formatSigned } from "@/lib/format";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";
import type { AnalysisResult, AssetType } from "@/lib/types";

function Panel({
  title,
  subtitle,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function pointColor(point: number): string {
  if (point > 0) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-semibold";
  if (point < 0) return "border-red-500/40 bg-red-500/15 text-red-400 font-semibold";
  return "border-zinc-700 bg-zinc-800 text-zinc-400";
}

const TIMEFRAME_OPTIONS: Array<{ key: TimeframeKey; label: string; short: string; desc: string }> = [
  { key: "5m", label: "5 Dakikalık", short: "5D", desc: "Scalping ve gün içi" },
  { key: "10m", label: "10 Dakikalık", short: "10D", desc: "Hızlı salınım" },
  { key: "15m", label: "15 Dakikalık", short: "15D", desc: "Standart gün içi" },
  { key: "30m", label: "30 Dakikalık", short: "30D", desc: "Dengeli gün içi" },
  { key: "1h", label: "1 Saatlik", short: "1S", desc: "Kısa vadeli gün içi" },
  { key: "2h", label: "2 Saatlik", short: "2S", desc: "Kısa-orta vadeli" },
  { key: "4h", label: "4 Saatlik", short: "4S", desc: "Gün içi salınım" },
  { key: "1d", label: "Günlük", short: "1G", desc: "Ana trend" },
  { key: "1wk", label: "Haftalık", short: "1H", desc: "Orta-uzun vadeli" },
  { key: "1mo", label: "Aylık", short: "1A", desc: "Makro trend" },
];

type TabType = "hybrid" | "tech" | "fund";

export default function SymbolDetail({ ticker, type }: { ticker: string; type: AssetType }) {
  const [selectedTf, setSelectedTf] = useState<TimeframeKey>("1d");
  const [activeTab, setActiveTab] = useState<TabType>("hybrid");
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("symbol_refresh_interval");
        if (saved != null) {
          const parsed = Number(saved) as RefreshInterval;
          if ([0, 15, 30, 60, 120, 300].includes(parsed)) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 30;
  });
  const [cache, setCache] = useState<Partial<Record<TimeframeKey, AnalysisResult>>>({});
  const [loadingTf, setLoadingTf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchTimeframeData = useCallback(
    async (tf: TimeframeKey, force = false) => {
      if (!force && cache[tf]) return; // Already cached
      setLoadingTf(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/analyze?ticker=${encodeURIComponent(ticker)}&type=${type}&timeframe=${tf}`,
          { cache: "no-store" }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        startTransition(() => {
          setCache((prev) => ({ ...prev, [tf]: body as AnalysisResult }));
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Veri alınamadı");
      } finally {
        setLoadingTf(false);
      }
    },
    [cache, ticker, type]
  );

  useEffect(() => {
    void fetchTimeframeData(selectedTf);

    if (refreshInterval <= 0) return;

    // Configurable auto-refresh interval
    const interval = setInterval(() => {
      void fetchTimeframeData(selectedTf, true);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [fetchTimeframeData, selectedTf, refreshInterval]);

  const currentResult = cache[selectedTf] ?? null;

  const handleTfChange = (tf: TimeframeKey) => {
    setSelectedTf(tf);
    if (!cache[tf]) {
      void fetchTimeframeData(tf);
    }
  };

  if (error && !currentResult) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-sm text-red-300">
        <p className="font-semibold text-base">Veri alınamadı: {ticker}</p>
        <p className="mt-1 text-red-400/80">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          ← Takip listesine dön
        </Link>
      </div>
    );
  }

  if (!currentResult && loadingTf) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-2xl border border-zinc-800 bg-zinc-900/60" />
        <div className="h-14 rounded-2xl border border-zinc-800 bg-zinc-900/60" />
        <div className="h-[420px] rounded-2xl border border-zinc-800 bg-zinc-900/60" />
      </div>
    );
  }

  if (!currentResult) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header Navigation */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Takip Listesine Dön
        </Link>
        <div className="flex items-center gap-2.5">
          <AutoRefreshControl
            intervalSeconds={refreshInterval}
            onIntervalChange={(sec) => setRefreshInterval(sec)}
            onRefresh={() => void fetchTimeframeData(selectedTf, true)}
            isRefreshing={loadingTf}
            lastUpdated={currentResult.updatedAt}
            storageKey="symbol_refresh_interval"
            size="sm"
            align="right"
          />
        </div>
      </div>

      {/* Signal Card (adapts to active tab) */}
      <SignalCard result={currentResult} activeTab={activeTab} />

      {/* Control Bar: Timeframe Selector & Tabs */}
      <div className="relative z-10 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4 backdrop-blur-md">
        {/* Timeframe Selector (Saatlik, Günlük, Haftalık, vb.) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Grafik & Analiz Periyodu:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {TIMEFRAME_OPTIONS.map((tf) => {
              const active = selectedTf === tf.key;
              return (
                <button
                  key={tf.key}
                  id={`tf-btn-${tf.key}`}
                  onClick={() => handleTfChange(tf.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-sky-500 bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                      : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  title={tf.desc}
                >
                  <span>{tf.label}</span>
                  <span
                    className={`rounded px-1 text-[10px] font-mono ${
                      active ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {tf.short}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Separator */}
        <div className="h-px w-full bg-zinc-800/80" />

        {/* Signal & Analysis Tabs (Karma, Teknik, Temel) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Al-Sat Sinyal Modu:
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            {/* Tab 1: Karma Sinyal */}
            <button
              id="tab-btn-hybrid"
              onClick={() => setActiveTab("hybrid")}
              className={`flex items-center justify-center sm:justify-start gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "hybrid"
                  ? "border-violet-500 bg-violet-500/20 text-violet-200 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/30"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm">🔀</span>
              <span className="truncate">Karma Sinyal</span>
              <span className="hidden sm:inline-flex">
                <SignalBadge signal={currentResult.signal} size="sm" />
              </span>
            </button>

            {/* Tab 2: Teknik Sinyal */}
            <button
              id="tab-btn-tech"
              onClick={() => setActiveTab("tech")}
              className={`flex items-center justify-center sm:justify-start gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "tech"
                  ? "border-sky-500 bg-sky-500/20 text-sky-200 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/30"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm">📈</span>
              <span className="truncate">Teknik Sinyal</span>
              <span className="hidden sm:inline-flex">
                <SignalBadge signal={currentResult.tech.signal} size="sm" />
              </span>
            </button>

            {/* Tab 3: Temel Sinyal */}
            <button
              id="tab-btn-fund"
              onClick={() => setActiveTab("fund")}
              className={`flex items-center justify-center sm:justify-start gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === "fund"
                  ? "border-amber-500 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm">🏢</span>
              <span className="truncate">Temel Sinyal</span>
              <span className="hidden sm:inline-flex">
                <SignalBadge signal={currentResult.fund?.signal ?? "TUT"} size="sm" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: HYBRID (KARMA SİNYAL - TEKNİK + TEMEL) */}
      {activeTab === "hybrid" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Hybrid Matrix & Assessment Card */}
          <section className="overflow-hidden rounded-2xl border border-violet-900/40 bg-gradient-to-r from-violet-950/30 via-zinc-900/80 to-zinc-900/90 p-5 shadow-lg backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-violet-400">
                    Bütünleşik Hibrit Karar Sistemi (%60 Teknik + %40 Temel)
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">
                  {currentResult.hybridAssessment?.label ?? "Karma Değerlendirme"}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {currentResult.hybridAssessment?.description ??
                    "Teknik momentum ile temel bilanço çarpanları ağırlıklı olarak birleştirildi."}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs">
                  <div className="text-center">
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Teknik Skor</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        currentResult.tech.score > 0
                          ? "text-emerald-400"
                          : currentResult.tech.score < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {formatSigned(currentResult.tech.score)}
                    </span>
                  </div>
                  <span className="text-zinc-600 font-bold">+</span>
                  <div className="text-center">
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Temel Skor</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        (currentResult.fund?.score ?? 0) > 0
                          ? "text-emerald-400"
                          : (currentResult.fund?.score ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {currentResult.fund?.score != null ? formatSigned(currentResult.fund.score) : "—"}
                    </span>
                  </div>
                  <span className="text-zinc-600 font-bold">=</span>
                  <div className="text-center">
                    <span className="text-violet-400 block text-[10px] uppercase font-semibold">Karma Skor</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        currentResult.score > 0
                          ? "text-emerald-400"
                          : currentResult.score < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {formatSigned(currentResult.score)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Distribution Bar */}
            <div className="mt-4 border-t border-zinc-800/80 pt-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                <span>Model Ağırlık Dağılımı</span>
                <span>%60 Teknik Analiz · %40 Temel Bilanço</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 w-[60%]" title="Teknik Ağırlık %60" />
                <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 w-[40%]" title="Temel Ağırlık %40" />
              </div>
            </div>

            {/* Actionable Summary Metrics */}
            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-zinc-800/80">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Trend Rejimi (ADX)</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {currentResult.tech.trendStrength?.regime === "strong_trend"
                    ? "🔥 Güçlü Trend"
                    : currentResult.tech.trendStrength?.regime === "ranging"
                    ? "⚡ Yatay Piyasa"
                    : "📈 Ilımlı Trend"}
                  {currentResult.tech.trendStrength?.adx != null ? ` (${currentResult.tech.trendStrength.adx})` : ""}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Dinamik Stop-Loss (ATR)</span>
                <span className="font-mono font-bold text-xs text-red-400">
                  {currentResult.tech.volatility?.stopLoss != null
                    ? formatPrice(currentResult.tech.volatility.stopLoss, currentResult.currency)
                    : "—"}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950/40 p-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Değerleme / Büyüme (PEG)</span>
                <span className="font-mono font-bold text-xs text-amber-400">
                  {currentResult.fundamentals?.peg != null
                    ? `${currentResult.fundamentals.peg.toFixed(2)} (${currentResult.fundamentals.peg <= 1.0 ? "İskontolu" : "Primli"})`
                    : currentResult.fundamentals?.pe != null
                    ? `F/K ${currentResult.fundamentals.pe.toFixed(1)}`
                    : "Makro"}
                </span>
              </div>
            </div>
          </section>

          {/* Main Price Chart */}
          <Panel
            title={`Karma Görünüm · Mum + SMA50 / SMA200 + Bollinger (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
            badge={
              <div className="flex flex-wrap gap-3 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[#2962ff] rounded-sm" /> SMA50
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[#ff6d00] rounded-sm" /> SMA200
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[rgba(41,98,255,0.5)] rounded-sm" /> Bollinger (20,2)
                </span>
              </div>
            }
          >
            <PriceChart
              candles={currentResult.candles}
              sma50={currentResult.ind.sma50}
              sma200={currentResult.ind.sma200}
              bb={currentResult.ind.bb}
              timeframe={selectedTf}
            />
          </Panel>

          {/* Side-by-Side: Key Tech & Key Fundamental Factors */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title="Öne Çıkan Teknik Sinyaller"
              subtitle={`${TIMEFRAMES[selectedTf]?.label ?? selectedTf} periyodundaki kilit göstergeler`}
              badge={<SignalBadge signal={currentResult.tech.signal} size="sm" />}
            >
              <ul className="space-y-2.5">
                {currentResult.tech.items.map((item) => (
                  <li key={item.name} className="flex items-start gap-3 text-xs sm:text-sm">
                    <span
                      className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                        item.point
                      )}`}
                    >
                      {item.point > 0 ? "+" : ""}
                      {item.point}
                    </span>
                    <span className="text-zinc-300">
                      <strong className="text-zinc-100">{item.name}:</strong> {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-xs text-zinc-500">
                <span>Teknik Skor: {formatSigned(currentResult.tech.score)}</span>
                <button
                  onClick={() => setActiveTab("tech")}
                  className="text-sky-400 hover:text-sky-300 font-semibold"
                >
                  Tüm Teknik Göstergeleri ve Panelleri Gör →
                </button>
              </div>
            </Panel>

            <Panel
              title="Öne Çıkan Temel Bilanço Rasyoları"
              subtitle="Şirketin değerleme, kârlılık ve borçluluk yapısı"
              badge={
                currentResult.fund ? (
                  <SignalBadge signal={currentResult.fund.signal} size="sm" />
                ) : (
                  <span className="text-xs text-zinc-500">Altın / Makro</span>
                )
              }
            >
              {currentResult.fund ? (
                <>
                  <table className="w-full text-xs sm:text-sm">
                    <tbody>
                      {currentResult.fund.metrics.map((m) => (
                        <tr key={m.key} className="border-b border-zinc-800/60 last:border-0">
                          <td className="py-2 text-zinc-400 font-medium">{m.label}</td>
                          <td className="py-2 text-right font-mono font-semibold tabular-nums text-zinc-200">
                            {m.display}
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                                m.point
                              )}`}
                            >
                              {m.point > 0 ? "+" : ""}
                              {m.point}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-xs text-zinc-500">
                    <span>
                      Temel Skor:{" "}
                      {currentResult.fund.score != null ? formatSigned(currentResult.fund.score) : "veri yok"}
                    </span>
                    <button
                      onClick={() => setActiveTab("fund")}
                      className="text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Tüm Temel Değerleme Detaylarını Gör →
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-400">
                  <p>Altın için şirket finansal tablosu bulunmaz; değerleme küresel makro dinamiklere bağlıdır.</p>
                  <button
                    onClick={() => setActiveTab("fund")}
                    className="mt-3 text-amber-400 hover:underline font-semibold"
                  >
                    Makro Göstergeleri İncele →
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TECHNICAL (TEKNİK SİNYAL) */}
      {activeTab === "tech" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Technical Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-900/40 bg-gradient-to-r from-sky-950/40 via-zinc-900/80 to-zinc-900/90 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-sky-400 animate-pulse" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                  Saf Teknik Analiz Modu
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-mono text-xs text-sky-300 font-bold">
                    {TIMEFRAMES[selectedTf]?.label ?? selectedTf}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ana Trend (%35), Trend Gücü (%25), Momentum (%25) ve Hacim (%15) kategorik ağırlıklarıyla hesaplanan teknik model.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Teknik Sinyal</span>
                <SignalBadge signal={currentResult.tech.signal} size="md" />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-2 text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Ağırlıklı Skor</span>
                <span
                  className={`font-mono text-base font-extrabold tabular-nums ${
                    currentResult.tech.score > 0
                      ? "text-emerald-400"
                      : currentResult.tech.score < 0
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  {formatSigned(currentResult.tech.score)}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Category Weights & Sub-Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Ana Trend (Ortalamalar)</span>
                <span className="font-mono text-sky-400 font-bold">%35</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-200">SMA200 & EMA20/50</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    (currentResult.tech.categoryScores?.trend ?? 0) > 0
                      ? "text-emerald-400"
                      : (currentResult.tech.categoryScores?.trend ?? 0) < 0
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {currentResult.tech.categoryScores?.trend != null
                    ? formatSigned(currentResult.tech.categoryScores.trend)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Trend Gücü & Rejim</span>
                <span className="font-mono text-indigo-400 font-bold">%25</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-200">ADX(14) Filtresi</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    (currentResult.tech.categoryScores?.regime ?? 0) > 0
                      ? "text-emerald-400"
                      : (currentResult.tech.categoryScores?.regime ?? 0) < 0
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {currentResult.tech.categoryScores?.regime != null
                    ? formatSigned(currentResult.tech.categoryScores.regime)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Momentum & Zamanlama</span>
                <span className="font-mono text-violet-400 font-bold">%25</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-200">MACD, RSI, Stoch</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    (currentResult.tech.categoryScores?.momentum ?? 0) > 0
                      ? "text-emerald-400"
                      : (currentResult.tech.categoryScores?.momentum ?? 0) < 0
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {currentResult.tech.categoryScores?.momentum != null
                    ? formatSigned(currentResult.tech.categoryScores.momentum)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Hacim & Volatilite</span>
                <span className="font-mono text-amber-400 font-bold">%15</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-200">Hacim & Bollinger</span>
                <span
                  className={`font-mono text-xs font-bold ${
                    (currentResult.tech.categoryScores?.volume ?? 0) > 0
                      ? "text-emerald-400"
                      : (currentResult.tech.categoryScores?.volume ?? 0) < 0
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {currentResult.tech.categoryScores?.volume != null
                    ? formatSigned(currentResult.tech.categoryScores.volume)
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Key Indicators Grid: ADX Trend Rejimi + ATR Risk Yönetimi */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* ADX Trend Gücü & Rejimi */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧭</span>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    ADX(14) Trend Gücü & Piyasa Rejimi
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-sky-400">
                  ADX: {currentResult.tech.trendStrength?.adx ?? currentResult.ind.adx?.at(-1)?.adx.toFixed(1) ?? "—"}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Piyasa Rejimi:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      currentResult.tech.trendStrength?.regime === "strong_trend"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : currentResult.tech.trendStrength?.regime === "ranging"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {currentResult.tech.trendStrength?.regime === "strong_trend"
                      ? "🔥 Güçlü Trend (ADX ≥ 25)"
                      : currentResult.tech.trendStrength?.regime === "ranging"
                      ? "⚡ Yatay / Testere Piyasası (ADX < 20)"
                      : "📈 Gelişen Trend (ADX 20-25)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Yön Eğilimi (+DI / -DI):</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {currentResult.tech.trendStrength?.direction === "up"
                      ? "🟢 Boğa Baskın (+DI > -DI)"
                      : "🔴 Ayı Baskın (-DI > +DI)"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2 mt-2 leading-relaxed">
                  {currentResult.tech.trendStrength?.regime === "ranging"
                    ? "Yatay piyasada hareketli ortalama kesişimleri yerine RSI ve Stokastik dip/tepe osilatörlerine öncelik verin."
                    : "Güçlü trend rejiminde trend yönündeki kırılımlar ve EMA takibi yüksek başarı oranına sahiptir."}
                </p>
              </div>
            </div>

            {/* ATR Dinamik Risk & Stop-Loss Yönetimi */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100">
                    ATR(14) Dinamik Volatilite & Risk Yönetimi
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  Volatilite: %{currentResult.tech.volatility?.atrPercent ?? "—"}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dinamik Stop-Loss (1.5x ATR):</span>
                  <span className="font-mono font-bold text-red-400">
                    {currentResult.tech.volatility?.stopLoss != null
                      ? formatPrice(currentResult.tech.volatility.stopLoss, currentResult.currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dinamik Kâr Al / Hedef (2.5x ATR):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {currentResult.tech.volatility?.takeProfit != null
                      ? formatPrice(currentResult.tech.volatility.takeProfit, currentResult.currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2 mt-2">
                  <span className="text-zinc-500">Önerilen Risk/Kazanç Oranı:</span>
                  <span className="font-mono font-semibold text-zinc-300">1 : 1.67 Pozitif Asimetri</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Price Chart */}
          <Panel
            title={`Fiyat Mum Grafiği · SMA50 / SMA200 & Bollinger (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
            badge={
              <div className="flex flex-wrap gap-3 text-xs text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[#2962ff] rounded-sm" /> SMA50
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[#ff6d00] rounded-sm" /> SMA200
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 bg-[rgba(41,98,255,0.5)] rounded-sm" /> Bollinger (20,2)
                </span>
              </div>
            }
          >
            <PriceChart
              candles={currentResult.candles}
              sma50={currentResult.ind.sma50}
              sma200={currentResult.ind.sma200}
              bb={currentResult.ind.bb}
              timeframe={selectedTf}
            />
          </Panel>

          {/* Indicator Panels: RSI & MACD */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title={`RSI (14) · Göreceli Güç Endeksi (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
              subtitle="30 Aşırı Satım (Alım Fırsatı) / 70 Aşırı Alım (Satış Riski)"
              badge={
                <span className="font-mono text-xs font-bold text-violet-300">
                  Son: {currentResult.ind.rsi.at(-1)?.toFixed(1) ?? "—"}
                </span>
              }
            >
              <RsiChart candles={currentResult.candles} rsi={currentResult.ind.rsi} />
            </Panel>

            <Panel
              title={`MACD (12,26,9) · Momentum & Kesişim (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
              subtitle="Mavi: MACD · Turuncu: Sinyal · Çubuklar: Histogram"
              badge={
                <span className="font-mono text-xs font-bold text-sky-400">
                  Histogram: {currentResult.ind.macd.at(-1)?.histogram?.toFixed(2) ?? "—"}
                </span>
              }
            >
              <MacdChart candles={currentResult.candles} macd={currentResult.ind.macd} />
            </Panel>
          </div>

          {/* Auxiliary Indicators Row: Stochastic, EMA20/50, Volume */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Stokastik */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">⚡ Stokastik (14,3,3)</span>
                <span className="font-mono font-bold text-sky-400">
                  {currentResult.ind.stoch?.at(-1)
                    ? `%K: ${currentResult.ind.stoch.at(-1)!.k.toFixed(0)} · %D: ${currentResult.ind.stoch.at(-1)!.d.toFixed(0)}`
                    : "—"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 leading-snug">
                {(() => {
                  const s = currentResult.ind.stoch?.at(-1);
                  if (!s) return "Yetersiz veri";
                  if (s.k < 20) return "Aşırı satım bölgesinde dip dönüşü aranıyor";
                  if (s.k > 80) return "Aşırı alım bölgesinde tepe yorulması riski";
                  return s.k > s.d ? "%K > %D pozitif momentum üstünlüğü" : "%K < %D negatif momentum baskısı";
                })()}
              </p>
            </div>

            {/* EMA 20 & EMA 50 */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">📏 EMA 20 / EMA 50</span>
                <span className="font-mono font-bold text-indigo-400">
                  {currentResult.ind.ema20?.at(-1) != null
                    ? `${formatPrice(currentResult.ind.ema20.at(-1)!, currentResult.currency)}`
                    : "—"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 leading-snug">
                {(() => {
                  const e20 = currentResult.ind.ema20?.at(-1);
                  const e50 = currentResult.ind.ema50?.at(-1);
                  if (!e20 || !e50) return "Yetersiz veri";
                  return e20 > e50
                    ? "EMA20 > EMA50: Kısa vadeli yükseliş trendi etkin"
                    : "EMA20 < EMA50: Kısa vadeli düşüş trendi baskısı";
                })()}
              </p>
            </div>

            {/* Hacim Teyidi */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">📊 20G Hacim Teyidi</span>
                <span className="font-mono font-bold text-amber-400">
                  {(() => {
                    const v = currentResult.candles.at(-1)?.volume;
                    const vSma = currentResult.ind.volSma20?.at(-1);
                    if (v && vSma && vSma > 0) {
                      return `%${((v / vSma) * 100).toFixed(0)} Katılım`;
                    }
                    return "Standart";
                  })()}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400 leading-snug">
                {(() => {
                  const v = currentResult.candles.at(-1)?.volume;
                  const vSma = currentResult.ind.volSma20?.at(-1);
                  if (!v || !vSma || vSma === 0) return "Hacim verisi takip ediliyor";
                  const ratio = v / vSma;
                  if (ratio >= 1.3) return "Ortalamanın üzerinde hacimli kurumsal işlem katılımı";
                  if (ratio < 0.7) return "Zayıf hacimli piyasa katılımı / temkinli fiyatlama";
                  return "20 günlük normal hacim seyrinde";
                })()}
              </p>
            </div>
          </div>

          {/* Technical Reasons & Rule Scoring Breakdown */}
          <Panel
            title={`Teknik İndikatör Puan Dökümü (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
            subtitle="10 farklı teknik göstergenin kurallara göre ürettiği puanlar ve gerekçeleri"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {currentResult.tech.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                >
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                      item.point
                    )}`}
                  >
                    {item.point > 0 ? "+" : ""}
                    {item.point}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{item.name}</h4>
                    <p className="mt-0.5 text-xs text-zinc-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-zinc-500 border-t border-zinc-800/80 pt-3">
              Hesaplanan teknik skor: <strong>{formatSigned(currentResult.tech.score)}</strong> → Teknik Karar:{" "}
              <strong>{currentResult.tech.signal}</strong>
            </p>
          </Panel>
        </div>
      )}

      {/* TAB CONTENT 3: FUNDAMENTAL (TEMEL SİNYAL) */}
      {activeTab === "fund" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Fundamental Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-900/40 bg-gradient-to-r from-amber-950/40 via-zinc-900/80 to-zinc-900/90 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                  Kurumsal Temel Analiz & Bilanço Modu
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-xs text-amber-300 font-bold">
                    4 Boyutlu Bilanço Karnesi
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Kârlılık (%35), Değerleme (%30), Borçluluk (%25) ve Büyüme (%10) kurumsal ağırlıklı model ile hesaplanan bilanço skoru.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Temel Sinyal</span>
                <SignalBadge signal={currentResult.fund?.signal ?? "TUT"} size="md" />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-2 text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Ağırlıklı Skor</span>
                <span
                  className={`font-mono text-base font-extrabold tabular-nums ${
                    (currentResult.fund?.score ?? 0) > 0
                      ? "text-emerald-400"
                      : (currentResult.fund?.score ?? 0) < 0
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  {currentResult.fund?.score != null ? formatSigned(currentResult.fund.score) : "—"}
                </span>
              </div>
            </div>
          </div>

          {currentResult.fund ? (
            <>
              {/* Fundamental Category Weights & Sub-Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Kârlılık & Marjlar</span>
                    <span className="font-mono text-emerald-400 font-bold">%35</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-zinc-200">Net/Faal. Marj & ROE</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        (currentResult.fund?.categoryScores?.profitability ?? 0) > 0
                          ? "text-emerald-400"
                          : (currentResult.fund?.categoryScores?.profitability ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {currentResult.fund?.categoryScores?.profitability != null
                        ? formatSigned(currentResult.fund.categoryScores.profitability)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Değerleme & Çarpanlar</span>
                    <span className="font-mono text-amber-400 font-bold">%30</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-zinc-200">PEG, F/K, PD/DD</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        (currentResult.fund?.categoryScores?.valuation ?? 0) > 0
                          ? "text-emerald-400"
                          : (currentResult.fund?.categoryScores?.valuation ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {currentResult.fund?.categoryScores?.valuation != null
                        ? formatSigned(currentResult.fund.categoryScores.valuation)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Mali Sağlamlık & Borç</span>
                    <span className="font-mono text-sky-400 font-bold">%25</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-zinc-200">Cari Oran & Borç/Öz</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        (currentResult.fund?.categoryScores?.solvency ?? 0) > 0
                          ? "text-emerald-400"
                          : (currentResult.fund?.categoryScores?.solvency ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {currentResult.fund?.categoryScores?.solvency != null
                        ? formatSigned(currentResult.fund.categoryScores.solvency)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Büyüme & Temettü</span>
                    <span className="font-mono text-violet-400 font-bold">%10</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-zinc-200">Gelir & Kâr Payı</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        (currentResult.fund?.categoryScores?.growth ?? 0) > 0
                          ? "text-emerald-400"
                          : (currentResult.fund?.categoryScores?.growth ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {currentResult.fund?.categoryScores?.growth != null
                        ? formatSigned(currentResult.fund.categoryScores.growth)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Category Institutional Breakdown */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* 1. Değerleme & Çarpanlar */}
                <Panel
                  title="📊 Değerleme & Çarpanlar (%30 Ağırlık)"
                  subtitle="Piyasa fiyatının kâra ve defter değerine oranı (PEG ve F/K öncelikli)"
                >
                  <div className="space-y-2.5">
                    {currentResult.fund.metrics
                      .filter((m) => m.category === "valuation" || ["pe", "pb", "peg"].includes(m.key))
                      .map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-200">{m.label}</span>
                              {m.weight != null && (
                                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">
                                  Ağırlık: x{m.weight}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.detail}</p>
                          </div>
                          <div className="flex items-center gap-2.5 text-right shrink-0">
                            <span className="font-mono text-base font-bold text-zinc-100">{m.display}</span>
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                                m.point
                              )}`}
                            >
                              {m.point > 0 ? "+" : ""}
                              {m.point}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>

                {/* 2. Kârlılık & Verimlilik */}
                <Panel
                  title="💼 Kârlılık & Marjlar (%35 Ağırlık)"
                  subtitle="Şirketin nakit kâr üretme gücü ve sermaye verimi (En Yüksek Öncelik)"
                >
                  <div className="space-y-2.5">
                    {currentResult.fund.metrics
                      .filter(
                        (m) =>
                          m.category === "profitability" ||
                          ["roe", "roa", "profitMargins", "operatingMargins"].includes(m.key)
                      )
                      .map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-200">{m.label}</span>
                              {m.weight != null && (
                                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">
                                  Ağırlık: x{m.weight}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.detail}</p>
                          </div>
                          <div className="flex items-center gap-2.5 text-right shrink-0">
                            <span className="font-mono text-base font-bold text-zinc-100">{m.display}</span>
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                                m.point
                              )}`}
                            >
                              {m.point > 0 ? "+" : ""}
                              {m.point}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>

                {/* 3. Mali Sağlamlık & Borçluluk */}
                <Panel
                  title="🛡️ Mali Sağlamlık & Likidite (%25 Ağırlık)"
                  subtitle="Kısa vadeli likidite güvenliği ve finansman riski kalkanı"
                >
                  <div className="space-y-2.5">
                    {currentResult.fund.metrics
                      .filter((m) => m.category === "solvency" || ["debtToEquity", "currentRatio"].includes(m.key))
                      .map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-200">{m.label}</span>
                              {m.weight != null && (
                                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">
                                  Ağırlık: x{m.weight}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.detail}</p>
                          </div>
                          <div className="flex items-center gap-2.5 text-right shrink-0">
                            <span className="font-mono text-base font-bold text-zinc-100">{m.display}</span>
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                                m.point
                              )}`}
                            >
                              {m.point > 0 ? "+" : ""}
                              {m.point}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>

                {/* 4. Büyüme & Temettü */}
                <Panel
                  title="🚀 Büyüme & Temettü (%10 Ağırlık)"
                  subtitle="Satış geliri büyüme ivmesi ve yatırımcıya nakit kâr payı akışı"
                >
                  <div className="space-y-2.5">
                    {currentResult.fund.metrics
                      .filter((m) => m.category === "growth" || ["revenueGrowth", "dividendYield"].includes(m.key))
                      .map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-200">{m.label}</span>
                              {m.weight != null && (
                                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[10px] text-zinc-400">
                                  Ağırlık: x{m.weight}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.detail}</p>
                          </div>
                          <div className="flex items-center gap-2.5 text-right shrink-0">
                            <span className="font-mono text-base font-bold text-zinc-100">{m.display}</span>
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-xs tabular-nums ${pointColor(
                                m.point
                              )}`}
                            >
                              {m.point > 0 ? "+" : ""}
                              {m.point}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
              </div>

              {/* Institutional Methodology Box */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-400 leading-relaxed shadow-lg">
                💡 <strong>Neden Ağırlıklı Puanlama?</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-300">
                  <li><strong>Kârlılık Önceliği (%35):</strong> Şirketin nakit kâr üretme kapasitesi en yüksek ağırlığa sahiptir; kâr edemeyen şirketin ucuzluğu değer tuzağıdır.</li>
                  <li><strong>Büyüme İskontosu (%30):</strong> PEG Oranı (x1.2) ve F/K (x1.0), statik defter değerine (PD/DD x0.6) göre çok daha ağırlıklıdır. Bu sayede teknoloji/yazılım hisseleri haksız yere elenmez.</li>
                  <li><strong>Finansal Güvenlik (%25):</strong> Yüksek faiz ortamında Cari Oran (x1.0) ve Borç/Özkaynak (x1.0) iflas ve nakit sıkışıklığı riskine karşı güvenlik kalkanıdır.</li>
                  <li><strong>Büyüme & Temettü (%10):</strong> Ciro ivmesi ve nakit temettü skora ilave pozitif katkı sağlar.</li>
                </ul>
              </div>

              {/* Price Chart for Context */}
              <Panel
                title={`Uzun Vadeli Fiyat Grafiği (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
                subtitle="Temel değerleme ile piyasa fiyatlamasının karşılaştırılması"
              >
                <PriceChart
                  candles={currentResult.candles}
                  sma50={currentResult.ind.sma50}
                  sma200={currentResult.ind.sma200}
                  bb={currentResult.ind.bb}
                  timeframe={selectedTf}
                />
              </Panel>
            </>
          ) : (
            <>
              {/* Macro & Gold View */}
              <Panel
                title="Makroekonomik Göstergeler (Altın & Döviz)"
                subtitle="Altın için şirket bilançosu yerine küresel makro veriler takip edilir"
              >
                <ul className="grid gap-3 sm:grid-cols-3">
                  {(currentResult.macro ?? []).map((m) => (
                    <li
                      key={m.ticker}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 flex flex-col justify-between"
                    >
                      <span className="text-xs text-zinc-400 font-medium">{m.label}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
                          {formatNumber(m.value, 3)}
                        </span>
                        <span
                          className={`font-mono text-xs font-bold ${
                            (m.changePercent ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatPercent(m.changePercent)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {currentResult.gramGoldTRY != null && (
                  <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-300">Gram Altın (TL) Karşılığı</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Ons Altın × USD/TRY ÷ 31.1035</p>
                    </div>
                    <span className="font-mono text-xl font-bold text-amber-300 tabular-nums">
                      {formatNumber(currentResult.gramGoldTRY, 2)} TL
                    </span>
                  </div>
                )}
              </Panel>

              {/* Price Chart */}
              <Panel
                title={`Altın Fiyat Grafiği (${TIMEFRAMES[selectedTf]?.label ?? selectedTf})`}
                subtitle="Hareketli ortalamalar ve volatilite bantları"
              >
                <PriceChart
                  candles={currentResult.candles}
                  sma50={currentResult.ind.sma50}
                  sma200={currentResult.ind.sma200}
                  bb={currentResult.ind.bb}
                  timeframe={selectedTf}
                />
              </Panel>
            </>
          )}
        </div>
      )}

      {/* Legal & Decision Support Disclaimer */}
      <footer className="mt-2 text-center text-xs text-zinc-500 py-3 border-t border-zinc-800/80">
        Bu sistem karar destek aracıdır, yatırım tavsiyesi değildir. Sinyaller geçmiş fiyat hareketlerine ve finansal verilere dayanır.
      </footer>
    </div>
  );
}

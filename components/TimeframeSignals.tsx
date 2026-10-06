"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";
import MailScheduleControl from "./MailScheduleControl";
import { formatPrice, formatSigned } from "@/lib/format";
import type { CategorizedSignals, TimeframeStockSignal } from "@/lib/multitimeframe";
import type { CategoryTimeframeKey } from "@/lib/timeframes";
import type { MailScheduleConfig } from "@/lib/mail-settings-storage";

const TIMEFRAME_TABS: Array<{ key: "all" | CategoryTimeframeKey; label: string; badge: string }> = [
  { key: "all", label: "Tüm Periyotlar", badge: "Özet" },
  { key: "5m", label: "5 Dakikalık", badge: "5dk" },
  { key: "10m", label: "10 Dakikalık", badge: "10dk" },
  { key: "15m", label: "15 Dakikalık", badge: "15dk" },
  { key: "30m", label: "30 Dakikalık", badge: "30dk" },
  { key: "1h", label: "1 Saatlik", badge: "1S" },
  { key: "2h", label: "2 Saatlik", badge: "2S" },
  { key: "4h", label: "4 Saatlik", badge: "4S" },
  { key: "1d", label: "Günlük", badge: "Günlük" },
  { key: "1wk", label: "Haftalık", badge: "1H" },
  { key: "1mo", label: "Aylık", badge: "1A" },
];

const ALL_CATEGORY_KEYS: CategoryTimeframeKey[] = [
  "5m",
  "10m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "1d",
  "1wk",
  "1mo",
];

type SignalMode = "hybrid" | "tech" | "fund";

export default function TimeframeSignals() {
  const [data, setData] = useState<CategorizedSignals | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | CategoryTimeframeKey>("all");
  const [signalMode, setSignalMode] = useState<SignalMode>("hybrid");
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mailConfig, setMailConfig] = useState<MailScheduleConfig | null>(null);

  // Load saved interval preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scanner_refresh_interval");
      if (saved != null) {
        const parsed = Number(saved) as RefreshInterval;
        if ([0, 15, 30, 60, 120, 300].includes(parsed)) {
          setRefreshInterval(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/signals/timeframes${force ? "?force=true" : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CategorizedSignals = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zaman dilimi sinyalleri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerScanAndMail = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/cron/multi-timeframe?force=true", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setScanMessage(
          json.mailed
            ? `✓ Tarama tamamlandı ve ${mailConfig?.emailLabel ?? "özet"} e-posta başarıyla gönderildi!`
            : `✓ Tarama tamamlandı. (${json.signalsCount} sinyal bulundu)`
        );
        void fetchData(true);
      } else {
        setScanMessage(`Hata: ${json.message}`);
      }
    } catch (e) {
      setScanMessage(e instanceof Error ? e.message : "Tarama sırasında hata oluştu.");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void fetchData();

    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      void fetchData(true);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const activeCategories: CategoryTimeframeKey[] = (
    activeTab === "all" ? ALL_CATEGORY_KEYS : [activeTab]
  ).filter((k) => data?.categories?.[k]);

  // Helper to get item signal & score based on mode
  const getSignalAndScore = (s: TimeframeStockSignal) => {
    if (signalMode === "tech") {
      return {
        signal: s.techSignal ?? s.signal,
        score: s.techScore ?? s.score,
      };
    }
    if (signalMode === "fund") {
      return {
        signal: s.fundSignal ?? "TUT",
        score: s.fundScore ?? 0,
      };
    }
    return {
      signal: s.signal,
      score: s.score,
    };
  };

  return (
    <section className="w-full">
      {/* Schedule & Banner Info */}
      <div className="relative z-30 mb-4 flex flex-col gap-3 rounded-2xl border border-sky-900/40 bg-gradient-to-r from-sky-950/30 via-zinc-900/80 to-zinc-900/90 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  Çoklu Zaman Dilimi AL/SAT Taraması
                </h2>
                {mailConfig?.intervalKey === "off" ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-mono font-semibold text-zinc-400 border border-zinc-700">
                    Mail: Kapalı
                  </span>
                ) : (
                  <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-indigo-300 border border-indigo-500/30">
                    ✉️ {mailConfig?.label ?? "15 dk"} Otomatik
                  </span>
                )}
                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700/60 hidden sm:inline-flex">
                  mail-settings.md
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {mailConfig?.intervalKey === "off"
                  ? "Otomatik e-posta gönderimi kapalıdır (mail-settings.md). İstediğiniz zaman sağdaki butondan anlık tarayıp gönderebilirsiniz."
                  : mailConfig?.intervalKey === "daily"
                  ? "Pazartesi - Cuma · 09:50 - 18:00 seans saatlerinde günde 1 kez otomatik kategorize e-posta gönderir."
                  : `Pazartesi - Cuma · 09:50 - 18:00 seans saatlerinde her ${
                      mailConfig?.label ?? "15 dakikada bir"
                    } otomatik kategorize e-posta gönderir.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MailScheduleControl
              size="sm"
              align="left"
              onScheduleChange={(cfg) => setMailConfig(cfg)}
            />
            <AutoRefreshControl
              intervalSeconds={refreshInterval}
              onIntervalChange={(sec) => setRefreshInterval(sec)}
              onRefresh={() => void fetchData(true)}
              isRefreshing={loading}
              lastUpdated={data?.scannedAt}
              storageKey="scanner_refresh_interval"
              size="sm"
              align="left"
            />
            <button
              onClick={triggerScanAndMail}
              disabled={scanning}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {scanning ? "Taranıyor & Gönderiliyor…" : "Şimdi Tara & Mail Gönder"}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-300">
            {scanMessage}
          </div>
        )}
      </div>

      {/* Filter Bars Container */}
      <div className="relative z-10 mb-4 flex flex-col gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 backdrop-blur-md">
        {/* Signal Mode Tabs: Karma, Teknik, Temel */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Sinyal Tipi:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSignalMode("hybrid")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                signalMode === "hybrid"
                  ? "border-violet-500 bg-violet-500/20 text-violet-200 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>🔀</span>
              <span>Karma Sinyaller</span>
            </button>
            <button
              onClick={() => setSignalMode("tech")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                signalMode === "tech"
                  ? "border-sky-500 bg-sky-500/20 text-sky-200 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>📈</span>
              <span>Sadece Teknik</span>
            </button>
            <button
              onClick={() => setSignalMode("fund")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                signalMode === "fund"
                  ? "border-amber-500 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>🏢</span>
              <span>Sadece Temel</span>
            </button>
          </div>
        </div>

        {/* Timeframe Tabs: 1s, 2s, 4s, 1wk, 1mo */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Periyot:
          </span>
          <div className="flex overflow-x-auto pb-0.5 scrollbar-none gap-1.5">
            {TIMEFRAME_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? "border-sky-500 bg-sky-500/20 text-sky-200 shadow-sm shadow-sky-500/10"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded px-1 text-[10px] ${
                      isActive ? "bg-sky-500/30 text-sky-300" : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-xs text-red-400">
          {error}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {activeCategories.map((tfKey) => {
            const cat = data?.categories[tfKey];
            if (!cat) return null;

            // Filter items based on active signalMode
            const allItems = [...cat.buys, ...cat.sells];
            const buys: TimeframeStockSignal[] = [];
            const sells: TimeframeStockSignal[] = [];

            for (const item of allItems) {
              const { signal } = getSignalAndScore(item);
              if (signal === "AL") buys.push(item);
              else if (signal === "SAT") sells.push(item);
            }

            buys.sort((a, b) => getSignalAndScore(b).score - getSignalAndScore(a).score);
            sells.sort((a, b) => getSignalAndScore(a).score - getSignalAndScore(b).score);

            return (
              <div
                key={tfKey}
                className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 shadow-lg backdrop-blur-md"
              >
                <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                      [{tfKey.toUpperCase()}]
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-zinc-100">{cat.label}</h3>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {buys.length} AL · {sells.length} SAT
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* BUY Section */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                      <span>🟢 AL Sinyalleri</span>
                      <span className="text-zinc-500">({buys.length})</span>
                    </div>

                    {buys.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 p-3 text-center text-[11px] text-zinc-500">
                        Aktif AL sinyali yok
                      </div>
                    ) : (
                      buys.slice(0, 4).map((b: TimeframeStockSignal) => {
                        const { score } = getSignalAndScore(b);
                        return (
                          <Link
                            key={b.ticker}
                            href={`/symbol/${encodeURIComponent(b.ticker)}`}
                            className="group block rounded-xl border border-emerald-950/40 bg-emerald-950/15 p-2.5 transition hover:border-emerald-800/80 hover:bg-emerald-950/30"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                                {b.code}
                              </span>
                              <span className="text-xs font-bold text-zinc-100 tabular-nums">
                                {formatPrice(b.price, "TRY")}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 truncate max-w-[120px]">{b.name}</span>
                              <span className="font-bold text-emerald-400">
                                {formatSigned(score)}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>

                  {/* SELL Section */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center justify-between">
                      <span>🔴 SAT Sinyalleri</span>
                      <span className="text-zinc-500">({sells.length})</span>
                    </div>

                    {sells.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 p-3 text-center text-[11px] text-zinc-500">
                        Aktif SAT sinyali yok
                      </div>
                    ) : (
                      sells.slice(0, 4).map((s: TimeframeStockSignal) => {
                        const { score } = getSignalAndScore(s);
                        return (
                          <Link
                            key={s.ticker}
                            href={`/symbol/${encodeURIComponent(s.ticker)}`}
                            className="group block rounded-xl border border-red-950/40 bg-red-950/15 p-2.5 transition hover:border-red-800/80 hover:bg-red-950/30"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-red-300 group-hover:text-red-200">
                                {s.code}
                              </span>
                              <span className="text-xs font-bold text-zinc-100 tabular-nums">
                                {formatPrice(s.price, "TRY")}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 truncate max-w-[120px]">{s.name}</span>
                              <span className="font-bold text-red-400">
                                {formatSigned(score)}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

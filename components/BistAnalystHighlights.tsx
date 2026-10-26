"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import { formatNumber, formatPrice, formatSigned } from "@/lib/format";
import type { TimeframeKey } from "@/lib/timeframes";
import BistValuationTable from "./BistValuationTable";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";

export interface BistMarketItem {
  ticker: string;
  code: string;
  name: string;
  icon?: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "AL" | "SAT" | "TUT";
  score: number;
  usStock?: {
    targetMeanPrice: number | null;
    upsidePercent: number | null;
    recommendationKey: string | null;
    recommendationMean: number | null;
    numberOfAnalystOpinions?: number | null;
    pe?: number | null;
    pb?: number | null;
    roe?: number | null;
    peg?: number | null;
  } | null;
}

function getRecommendationBadge(key: string | null | undefined, opinions?: number | null) {
  if (!key) return <span className="text-zinc-500">—</span>;
  const lower = key.toLowerCase();
  const countLabel = opinions ? ` · ${opinions} Analist` : "";

  if (lower.includes("strong_buy") || lower === "strongbuy") {
    return (
      <span
        title={`Konsensüs: Güçlü AL${countLabel}`}
        className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
      >
        Güçlü AL{countLabel}
      </span>
    );
  }
  if (lower.includes("buy")) {
    return (
      <span
        title={`Konsensüs: AL${countLabel}`}
        className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
      >
        AL{countLabel}
      </span>
    );
  }
  if (lower.includes("hold")) {
    return (
      <span
        title={`Konsensüs: TUT${countLabel}`}
        className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400"
      >
        TUT{countLabel}
      </span>
    );
  }
  if (lower.includes("sell") || lower.includes("underperform")) {
    return (
      <span
        title={`Konsensüs: SAT / Zayıf${countLabel}`}
        className="inline-flex items-center rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400"
      >
        SAT{countLabel}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
      {key}
    </span>
  );
}

const BIST_ICONS: Record<string, string> = {
  THYAO: "✈️",
  ASELS: "🛡️",
  GARAN: "🏦",
  TUPRS: "🛢️",
  EREGL: "🏗️",
  BIMAS: "🛒",
  KCHOL: "🏛️",
  SISE: "🥛",
  AKBNK: "🏧",
  FROTO: "🚗",
  PGSUS: "🛫",
  SAHOL: "🏢",
  ISCTR: "💳",
  YKBNK: "🏦",
};

export default function BistAnalystHighlights({
  timeframe = "1d",
}: {
  timeframe?: TimeframeKey;
}) {
  const [items, setItems] = useState<BistMarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"leaders" | "top_upside">("leaders");
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(60);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/market-summary?market=bist&timeframe=${timeframe}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } catch (e) {
      console.warn("[BistAnalystHighlights] Veri alınamadı:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [timeframe]);

  // Load saved refresh setting and mode on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [refRes, bistRes] = await Promise.all([
          fetch("/api/settings/refresh?market=bist_analyst", { cache: "no-store" }),
          fetch("/api/settings/bist", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (refRes.ok) {
          const json = await refRes.json();
          const sec = json.config?.markets?.bist_analyst ?? json.effectiveSeconds;
          if (sec !== undefined) {
            setRefreshInterval(sec as RefreshInterval);
          }
        }

        if (bistRes.ok) {
          const bJson = await bistRes.json();
          if (bJson.settings?.analystFilterMode) {
            setFilterMode(bJson.settings.analystFilterMode);
          }
        }
      } catch {
        // fallback
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleFilterModeChange = (mode: "leaders" | "top_upside") => {
    setFilterMode(mode);
    void fetch("/api/settings/bist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analystFilterMode: mode }),
    }).catch(() => {});
  };

  // Dinamik otomatik yenileme zamanlayıcısı
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, timeframe]);

  // Leaders default 4: THYAO, ASELS, GARAN, TUPRS
  const leaderCodes = ["THYAO", "ASELS", "GARAN", "TUPRS"];
  const leaderItems = leaderCodes
    .map((code) => items.find((i) => i.code === code))
    .filter(Boolean) as BistMarketItem[];

  // Top upside items sorted by analyst upside percentage
  const topUpsideItems = [...items]
    .filter((i) => i.usStock?.upsidePercent != null)
    .sort((a, b) => (b.usStock?.upsidePercent ?? 0) - (a.usStock?.upsidePercent ?? 0))
    .slice(0, 4);

  const displayedItems = filterMode === "leaders" ? (leaderItems.length > 0 ? leaderItems : items.slice(0, 4)) : topUpsideItems;

  // Summary Metrics Overview (identical to UsStocksDashboard)
  const totalCount = items.length;
  const buyCount = items.filter((d) => d.signal === "AL").length;
  const sellCount = items.filter((d) => d.signal === "SAT").length;
  const upsideItems = items.filter(
    (d) => d.usStock?.upsidePercent != null && !isNaN(d.usStock.upsidePercent)
  );
  const avgUpside =
    upsideItems.length > 0
      ? upsideItems.reduce((acc, cur) => acc + (cur.usStock?.upsidePercent ?? 0), 0) /
        upsideItems.length
      : 0;

  return (
    <section id="bist-analyst-section" className="flex flex-col gap-4 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="text-base sm:text-lg">🎯</span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100">
              BIST Analist Konsensüsü & Hedef Fiyatlar
            </h2>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
              12 Aylık Hedef
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Aracı kurum ve yatırım bankalarının (İş Yatırım, Garanti, Ak Yatırım vb.) ortalama hedef fiyat ve getiri potansiyelleri.
          </p>
        </div>

        {/* View Mode Toggle & AutoRefreshControl */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            <button
              type="button"
              onClick={() => handleFilterModeChange("leaders")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterMode === "leaders"
                  ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🏆 BIST Liderleri
            </button>
            <button
              type="button"
              onClick={() => handleFilterModeChange("top_upside")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterMode === "top_upside"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🚀 En Yüksek Potansiyel
            </button>
          </div>

          <AutoRefreshControl
            intervalSeconds={refreshInterval}
            onIntervalChange={(sec) => setRefreshInterval(sec)}
            onRefresh={() => void loadData()}
            isRefreshing={loading}
            market="bist_analyst"
            storageKey="bist_analyst_refresh_interval"
            size="sm"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4"
              />
            ))
          : displayedItems.map((stock) => {
              const icon = BIST_ICONS[stock.code] || "🇹🇷";
              const upside = stock.usStock?.upsidePercent;
              const hasTarget = stock.usStock?.targetMeanPrice != null;

              return (
                <Link
                  key={stock.ticker}
                  href={`/symbol/${encodeURIComponent(stock.ticker)}?tf=${timeframe}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/5"
                >
                  {/* Card Header: Ticker, Name, Signal */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-label={stock.code}>
                          {icon}
                        </span>
                        <div>
                          <span className="font-mono text-sm font-extrabold text-zinc-100 group-hover:text-sky-300 transition">
                            {stock.code}
                          </span>
                          <span className="ml-1 text-[11px] font-mono text-zinc-500">
                            .IS
                          </span>
                        </div>
                      </div>
                      <SignalBadge signal={stock.signal} size="sm" />
                    </div>
                    <div className="mt-1 text-xs text-zinc-400 truncate font-medium">
                      {stock.name}
                    </div>
                  </div>

                  {/* Price & Daily Change */}
                  <div className="my-2.5">
                    <div className="font-mono text-xl font-black tracking-tight text-zinc-100">
                      {formatPrice(stock.price, "TRY")}
                    </div>
                    <div
                      className={`font-mono text-xs font-bold ${
                        stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatSigned(stock.changePercent, 2)}%
                    </div>
                  </div>

                  {/* Analyst Target Price & Upside Box */}
                  <div className="border-t border-zinc-800/90 pt-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Analist Görüşü:</span>
                      <div>
                        {getRecommendationBadge(
                          stock.usStock?.recommendationKey,
                          stock.usStock?.numberOfAnalystOpinions
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Ort. Hedef Fiyat:</span>
                      <strong className="font-mono text-zinc-200">
                        {hasTarget
                          ? `₺${formatNumber(stock.usStock!.targetMeanPrice!, 1)}`
                          : "—"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Getiri Potansiyeli:</span>
                      <span
                        className={`font-mono font-bold ${
                          upside != null && upside > 0
                            ? "text-emerald-400"
                            : upside != null && upside < 0
                            ? "text-red-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {upside != null ? `${upside > 0 ? "+" : ""}${upside}%` : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>

      {/* Summary Metrics Overview (BIST Ekosistemi Özeti) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="text-xs text-zinc-400">Taranan BIST Şirketleri</div>
          <div className="mt-1 font-mono text-xl font-black text-zinc-100">
            {loading ? "..." : `${totalCount} Şirket`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">BIST 100 &amp; 30 Ekosistemi</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="text-xs text-zinc-400">🟢 AL Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-emerald-400">
            {loading ? "..." : `${buyCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((buyCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Teknik &amp; analist pozitif</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="text-xs text-zinc-400">🔴 SAT Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-red-400">
            {loading ? "..." : `${sellCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((sellCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Düşüş eğilimi / kâr realizasyonu</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
          <div className="text-xs text-zinc-400">Ortalama Analist Potansiyeli</div>
          <div
            className={`mt-1 font-mono text-xl font-black ${
              avgUpside >= 0 ? "text-emerald-400" : "text-zinc-300"
            }`}
          >
            {loading ? "..." : `${avgUpside >= 0 ? "+" : ""}${avgUpside.toFixed(1)}%`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Konsensüs analist hedefleri</div>
        </div>
      </div>

      {/* Borsa İstanbul Hisseleri & Değerleme Tablosu */}
      <BistValuationTable
        items={items}
        loading={loading}
        timeframe={timeframe}
        onRefresh={loadData}
      />
    </section>
  );
}

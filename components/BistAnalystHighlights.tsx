"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import { formatNumber, formatPrice, formatSigned } from "@/lib/format";
import type { TimeframeKey } from "@/lib/timeframes";

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

  return (
    <section className="flex flex-col gap-3">
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

        {/* View Mode Toggle */}
        <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode("leaders")}
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
            onClick={() => setFilterMode("top_upside")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filterMode === "top_upside"
                ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🚀 En Yüksek Potansiyel
          </button>
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
    </section>
  );
}

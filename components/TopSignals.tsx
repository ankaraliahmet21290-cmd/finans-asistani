"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { RankedStock, TopSignalsResponse } from "@/app/api/signals/top/route";

function StockRankingCard({
  title,
  subtitle,
  variant,
  items,
  loading,
}: {
  title: string;
  subtitle: string;
  variant: "buy" | "sell";
  items: RankedStock[];
  loading: boolean;
}) {
  const isBuy = variant === "buy";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-xl transition backdrop-blur-md overflow-hidden ${
        isBuy
          ? "border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 via-zinc-900/70 to-zinc-950/90"
          : "border-red-900/40 bg-gradient-to-b from-red-950/20 via-zinc-900/70 to-zinc-950/90"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                isBuy
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isBuy ? "▲" : "▼"}
            </span>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100 truncate">
              {title}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400 truncate">{subtitle}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
            isBuy
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {isBuy ? "En Güçlü AL" : "En Güçlü SAT"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 py-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-500">
          Değerlendirilen sembol bulunamadı.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((stock, idx) => {
            const isUp = (stock.change ?? 0) >= 0;

            return (
              <li key={stock.ticker} className="min-w-0">
                <Link
                  href={`/symbol/${encodeURIComponent(stock.ticker)}`}
                  className="group block rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 transition hover:border-zinc-700 hover:bg-zinc-850 hover:shadow-lg"
                >
                  {/* Top line: Rank, Code, Name and Price */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
                          idx === 0
                            ? isBuy
                              ? "bg-emerald-500 text-zinc-950 font-black"
                              : "bg-red-500 text-zinc-950 font-black"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm text-zinc-100 group-hover:text-sky-400 shrink-0 font-mono">
                        {stock.code}
                      </span>
                      <span className="truncate text-xs text-zinc-400">
                        {stock.name}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="font-semibold tabular-nums text-xs sm:text-sm text-zinc-100">
                        {formatPrice(stock.price, stock.currency)}
                      </span>
                      <span
                        className={`ml-1.5 text-[11px] font-medium tabular-nums ${
                          isUp ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatPercent(stock.changePercent)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom line: Reason preview + Tech/Fund score + Signal Badge */}
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-800/50 pt-2 text-xs">
                    <div className="min-w-0 flex-1">
                      {stock.reasons.length > 0 ? (
                        <p className="truncate text-[11px] text-zinc-400" title={stock.reasons[0]}>
                          {stock.reasons[0]}
                        </p>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Teknik trend nötr</span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center gap-1.5 text-right">
                        <span className="hidden sm:inline-block text-[10px] text-zinc-500 font-mono">
                          T:{formatSigned(stock.techScore, 1)} F:{stock.fundScore != null ? formatSigned(stock.fundScore, 1) : "—"}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                            stock.score > 0
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : stock.score < 0
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {formatSigned(stock.score)}
                        </span>
                      </div>
                      <SignalBadge signal={stock.signal} size="sm" />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function TopSignals() {
  const [data, setData] = useState<TopSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/signals/top${force ? "?force=true" : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TopSignalsResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sinyaller yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSignals();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchSignals(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchSignals]);

  return (
    <section className="w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">
              Lider Sinyaller
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            BIST lider hisseleri arasında teknik ve temel puana göre en yüksek AL ve SAT adayları
            {data?.updatedAt && (
              <span> · Güncellenme: {new Date(data.updatedAt).toLocaleTimeString("tr-TR")}</span>
            )}
          </p>
        </div>

        <button
          onClick={() => void fetchSignals(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-sky-400" : ""}`}
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
          {refreshing ? "Güncelleniyor…" : "Yenile"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-xs text-red-400">
          Sinyal sıralaması yüklenirken bir hata oluştu: {error}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <StockRankingCard
            title="En Yüksek AL Puanı"
            subtitle="Teknik & Temel göstergeleri en pozitif hisseler"
            variant="buy"
            items={data?.buys ?? []}
            loading={loading}
          />
          <StockRankingCard
            title="En Yüksek SAT Puanı"
            subtitle="Teknik & Temel göstergeleri en negatif hisseler"
            variant="sell"
            items={data?.sells ?? []}
            loading={loading}
          />
        </div>
      )}
    </section>
  );
}

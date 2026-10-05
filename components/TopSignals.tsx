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
      className={`flex flex-col rounded-2xl border p-5 shadow-xl transition backdrop-blur-sm ${
        isBuy
          ? "border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-900/40"
          : "border-red-900/40 bg-gradient-to-b from-red-950/20 to-zinc-900/40"
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                isBuy
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isBuy ? "▲" : "▼"}
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
              {title}
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            isBuy
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {isBuy ? "En Güçlü AL" : "En Güçlü SAT"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40"
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
              <li key={stock.ticker}>
                <Link
                  href={`/symbol/${encodeURIComponent(stock.ticker)}`}
                  className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 transition hover:border-zinc-700 hover:bg-zinc-800/60 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                        idx === 0
                          ? isBuy
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-red-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 group-hover:text-sky-400">
                          {stock.code}
                        </span>
                        <span className="truncate text-xs text-zinc-400">
                          {stock.name}
                        </span>
                      </div>
                      {stock.reasons.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {stock.reasons[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex shrink-0 items-center justify-between gap-4 border-t border-zinc-800/60 pt-2 sm:mt-0 sm:border-0 sm:pt-0">
                    <div className="text-right">
                      <div className="font-medium tabular-nums text-zinc-200">
                        {formatPrice(stock.price, stock.currency)}
                      </div>
                      <div
                        className={`text-xs tabular-nums ${
                          isUp ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatPercent(stock.changePercent)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`font-semibold tabular-nums text-xs ${
                            stock.score > 0
                              ? "text-emerald-400"
                              : stock.score < 0
                              ? "text-red-400"
                              : "text-zinc-400"
                          }`}
                        >
                          Skor {formatSigned(stock.score)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          T: {formatSigned(stock.techScore)} | F:{" "}
                          {stock.fundScore != null
                            ? formatSigned(stock.fundScore)
                            : "—"}
                        </div>
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
  }, [fetchSignals]);

  return (
    <section className="w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              Lider Sinyaller
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            BIST lider hisseleri arasında teknik ve temel puana göre en yüksek AL ve SAT adayları
            {data?.updatedAt && (
              <span> · {new Date(data.updatedAt).toLocaleTimeString("tr-TR")}</span>
            )}
          </p>
        </div>

        <button
          onClick={() => void fetchSignals(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
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
            subtitle="Teknik & Temel göstergeleri en pozitif olan şirketler"
            variant="buy"
            items={data?.buys ?? []}
            loading={loading}
          />
          <StockRankingCard
            title="En Yüksek SAT Puanı"
            subtitle="Teknik & Temel göstergeleri en negatif / satış baskılı olan şirketler"
            variant="sell"
            items={data?.sells ?? []}
            loading={loading}
          />
        </div>
      )}
    </section>
  );
}

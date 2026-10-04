"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PriceChart from "./PriceChart";
import SignalCard from "./SignalCard";
import { MacdChart, RsiChart } from "./IndicatorCharts";
import { formatNumber, formatPercent, formatSigned } from "@/lib/format";
import type { AnalysisResult, AssetType } from "@/lib/types";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function pointColor(point: number): string {
  if (point > 0) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-500";
  if (point < 0) return "border-red-500/40 bg-red-500/15 text-red-500";
  return "border-zinc-700 bg-zinc-800 text-zinc-400";
}

export default function SymbolDetail({ ticker, type }: { ticker: string; type: AssetType }) {
  const requestKey = `${type}:${ticker}`;
  const [state, setState] = useState<{
    key: string | null;
    data: AnalysisResult | null;
    error: string | null;
  }>({ key: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/analyze?ticker=${encodeURIComponent(ticker)}&type=${type}`,
          { cache: "no-store" }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setState({ key: requestKey, data: body as AnalysisResult, error: null });
      } catch (e) {
        if (!cancelled) {
          setState({
            key: requestKey,
            data: null,
            error: e instanceof Error ? e.message : "Veri alınamadı",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestKey, ticker, type]);

  const result = state.key === requestKey ? state.data : null;
  const error = state.key === requestKey ? state.error : null;

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-sm text-red-300">
        <p className="font-medium">Veri alınamadı: {ticker}</p>
        <p className="mt-1 text-red-400/80">{error}</p>
        <Link href="/" className="mt-3 inline-block text-zinc-400 underline hover:text-zinc-200">
          ← Takip listesine dön
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/60" />
        <div className="h-[420px] rounded-xl border border-zinc-800 bg-zinc-900/60" />
        <div className="h-[190px] rounded-xl border border-zinc-800 bg-zinc-900/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Takip listesi
        </Link>
        <span className="text-xs text-zinc-600">
          {new Date(result.updatedAt).toLocaleString("tr-TR")}
        </span>
      </div>

      <SignalCard result={result} />

      <Panel title="Fiyat · Mum + SMA50 / SMA200 + Bollinger">
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[#2962ff]" /> SMA50
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[#ff6d00]" /> SMA200
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[rgba(41,98,255,0.5)]" /> Bollinger (20,2)
          </span>
        </div>
        <PriceChart candles={result.candles} sma50={result.ind.sma50} sma200={result.ind.sma200} bb={result.ind.bb} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="RSI (14) · 30 aşırı satım / 70 aşırı alım">
          <RsiChart candles={result.candles} rsi={result.ind.rsi} />
        </Panel>
        <Panel title="MACD (12,26,9)">
          <MacdChart candles={result.candles} macd={result.ind.macd} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Neden bu sinyal?">
          <ul className="space-y-2">
            {result.tech.items.map((item) => (
              <li key={item.name} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${pointColor(item.point)}`}
                >
                  {item.point > 0 ? "+" : ""}
                  {item.point}
                </span>
                <span className="text-zinc-300">
                  <span className="font-medium text-zinc-200">{item.name}</span> — {item.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-600">
            Teknik skor {formatSigned(result.tech.score)} / nihai skor {formatSigned(result.score)} →{" "}
            {result.signal}
          </p>
        </Panel>

        {result.fund ? (
          <Panel title="Temel analiz">
            <table className="w-full text-sm">
              <tbody>
                {result.fund.metrics.map((m) => (
                  <tr key={m.key} className="border-b border-zinc-800/70 last:border-0">
                    <td className="py-2 pr-3 text-zinc-500">{m.label}</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-zinc-200">
                      {m.display}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${pointColor(m.point)}`}
                      >
                        {m.point > 0 ? "+" : ""}
                        {m.point}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-zinc-600">
              Temel skor:{" "}
              {result.fund.score == null
                ? "yeterli veri yok, sadece teknik skor kullanıldı"
                : formatSigned(result.fund.score)}
            </p>
          </Panel>
        ) : (
          <Panel title="Makro göstergeler (ikincil)">
            <ul className="space-y-2 text-sm">
              {(result.macro ?? []).map((m) => (
                <li key={m.ticker} className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">{m.label}</span>
                  <span className="tabular-nums text-zinc-200">
                    {formatNumber(m.value, 3)}{" "}
                    <span
                      className={
                        (m.changePercent ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {formatPercent(m.changePercent)}
                    </span>
                  </span>
                </li>
              ))}
              {result.gramGoldTRY != null && (
                <li className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-2">
                  <span className="text-zinc-400">Gram altın (TL)</span>
                  <span className="tabular-nums text-zinc-200">
                    {formatNumber(result.gramGoldTRY, 2)}
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-zinc-600">
              Altında temel analiz yerine yalnızca teknik skor kullanılır.
            </p>
          </Panel>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Bu sistem karar destek aracıdır, yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}

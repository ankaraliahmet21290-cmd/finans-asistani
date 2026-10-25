"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import TimeframeSelector from "./TimeframeSelector";
import { formatNumber, formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { TimeframeKey } from "@/lib/types";

interface CryptoItemData {
  ticker: string;
  name: string;
  icon?: string;
  category: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "AL" | "SAT" | "TUT";
  score: number;
  techScore: number;
  fundScore: number | null;
  timeframe: string;
  crypto?: {
    marketCap: number | null;
    volume24h: number | null;
    volumeToMarketCap: number | null;
    circulatingSupply: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    athDropPercent: number | null;
  };
  indicators: {
    rsi: number | null;
    sma50: number | null;
    sma200: number | null;
    bbUpper: number | null;
    bbLower: number | null;
  };
  reasons: string[];
}

function formatCryptoCap(val: number | null | undefined): string {
  if (val == null || val === 0) return "—";
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${formatNumber(val, 0)}`;
}

export default function CryptoDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("4h");
  const [data, setData] = useState<CryptoItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (tf: TimeframeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-summary?market=crypto&timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
      }
    } catch (e) {
      console.error("[CryptoDashboard] Veri çekilemedi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(timeframe);
  }, [timeframe]);

  const btc = data.find((d) => d.ticker === "BTC-USD");
  const eth = data.find((d) => d.ticker === "ETH-USD");
  const sol = data.find((d) => d.ticker === "SOL-USD");

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            7/24 Kesintisiz Kripto Para Seansı
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Kripto Para AL/SAT Sinyalleri & Ekosistem Analizi
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base leading-relaxed">
            Bitcoin, Ethereum, Solana ve popüler altcoinler için <strong>7/24 dinamik trend takibi (Supertrend, Stoch RSI)</strong>, 24s Hacim/Piyasa Değeri likiditesi ve ATH düşüş analizi.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Analiz Periyodu:
            </span>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} size="sm" />
          </div>
        </div>
      </section>

      {/* Top 3 Major Crypto Radar */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* BTC */}
        <Link
          href="/symbol/BTC-USD"
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg transition hover:border-amber-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-lg font-bold">
                ₿
              </span>
              <div>
                <h3 className="font-bold text-zinc-100">Bitcoin</h3>
                <span className="font-mono text-xs text-zinc-500">BTC / USD</span>
              </div>
            </div>
            {btc && <SignalBadge signal={btc.signal} size="md" />}
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-zinc-100">
              {btc ? formatPrice(btc.price, "USD") : "—"}
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                btc && btc.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {btc ? `${formatSigned(btc.changePercent, 2)}%` : "—"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-[11px] text-zinc-400">
            <span>Piyasa Değeri: <strong className="text-zinc-200">{formatCryptoCap(btc?.crypto?.marketCap)}</strong></span>
            <span>24s Hacim: <strong className="text-zinc-200">{formatCryptoCap(btc?.crypto?.volume24h)}</strong></span>
          </div>
        </Link>

        {/* ETH */}
        <Link
          href="/symbol/ETH-USD"
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg transition hover:border-indigo-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-lg font-bold">
                Ξ
              </span>
              <div>
                <h3 className="font-bold text-zinc-100">Ethereum</h3>
                <span className="font-mono text-xs text-zinc-500">ETH / USD</span>
              </div>
            </div>
            {eth && <SignalBadge signal={eth.signal} size="md" />}
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-zinc-100">
              {eth ? formatPrice(eth.price, "USD") : "—"}
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                eth && eth.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {eth ? `${formatSigned(eth.changePercent, 2)}%` : "—"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-[11px] text-zinc-400">
            <span>Piyasa Değeri: <strong className="text-zinc-200">{formatCryptoCap(eth?.crypto?.marketCap)}</strong></span>
            <span>24s Hacim: <strong className="text-zinc-200">{formatCryptoCap(eth?.crypto?.volume24h)}</strong></span>
          </div>
        </Link>

        {/* SOL */}
        <Link
          href="/symbol/SOL-USD"
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg transition hover:border-purple-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-lg font-bold">
                ◎
              </span>
              <div>
                <h3 className="font-bold text-zinc-100">Solana</h3>
                <span className="font-mono text-xs text-zinc-500">SOL / USD</span>
              </div>
            </div>
            {sol && <SignalBadge signal={sol.signal} size="md" />}
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-zinc-100">
              {sol ? formatPrice(sol.price, "USD") : "—"}
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                sol && sol.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {sol ? `${formatSigned(sol.changePercent, 2)}%` : "—"}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2.5 text-[11px] text-zinc-400">
            <span>Piyasa Değeri: <strong className="text-zinc-200">{formatCryptoCap(sol?.crypto?.marketCap)}</strong></span>
            <span>24s Hacim: <strong className="text-zinc-200">{formatCryptoCap(sol?.crypto?.volume24h)}</strong></span>
          </div>
        </Link>
      </section>

      {/* Main Crypto Assets Table */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Popüler Kripto Varlıklar & Karar Destek Skorları ({data.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Teknik momentum, RSI, 24s likidite ve ATH mesafe göstergeleri ile hesaplanan AL/SAT/TUT sinyalleri.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse py-12 text-center text-xs text-zinc-500">
            Kripto piyasaları canlı taranıyor...
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Kripto Varlık</th>
                  <th className="px-3 py-3 text-right">Fiyat (USD)</th>
                  <th className="px-3 py-3 text-right">24s Değişim</th>
                  <th className="px-3 py-3 text-center">Sinyal ({timeframe.toUpperCase()})</th>
                  <th className="px-3 py-3 text-right">Piyasa Değeri</th>
                  <th className="px-3 py-3 text-right">24s Hacim/MCap</th>
                  <th className="px-3 py-3 text-right">52H Zirveden (-%)</th>
                  <th className="px-3 py-3 text-right">RSI (14)</th>
                  <th className="px-3 py-3">Teknik Durum</th>
                  <th className="px-3 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {data.map((item) => {
                  const volMcap = item.crypto?.volumeToMarketCap;
                  const isHighLiquidity = volMcap != null && volMcap > 0.08;

                  return (
                    <tr key={item.ticker} className="transition hover:bg-zinc-800/40">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <div className="font-bold text-zinc-100">{item.name}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{item.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100">
                        {formatPrice(item.price, "USD")}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono font-bold ${
                          item.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatSigned(item.changePercent, 2)}%
                      </td>
                      <td className="px-3 py-3 text-center">
                        <SignalBadge signal={item.signal} size="sm" />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-300">
                        {formatCryptoCap(item.crypto?.marketCap)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {volMcap != null ? (
                          <span className={isHighLiquidity ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                            %{(volMcap * 100).toFixed(1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-amber-400/90 font-semibold">
                        {item.crypto?.athDropPercent != null ? `${item.crypto.athDropPercent.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.indicators?.rsi != null ? (
                          <span
                            className={
                              item.indicators.rsi >= 70
                                ? "text-amber-400 font-bold"
                                : item.indicators.rsi <= 30
                                ? "text-emerald-400 font-bold"
                                : "text-zinc-300"
                            }
                          >
                            {formatNumber(item.indicators.rsi, 1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-400 max-w-xs truncate">
                        {item.reasons[0] || "7/24 Kesintisiz Piyasa"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/symbol/${encodeURIComponent(item.ticker)}`}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white transition"
                        >
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

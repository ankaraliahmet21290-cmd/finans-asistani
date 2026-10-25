"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import TimeframeSelector from "./TimeframeSelector";
import PositionTracker from "./PositionTracker";
import WatchlistTable from "./WatchlistTable";
import TimeframeSignals from "./TimeframeSignals";
import TopSignals from "./TopSignals";
import TrackListTable from "./TrackListTable";
import BistCombobox from "./BistCombobox";
import SelectedCompanyPreview from "./SelectedCompanyPreview";
import MailScheduleControl from "./MailScheduleControl";
import MailRecipientsControl from "./MailRecipientsControl";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";
import { formatNumber, formatPercent, formatPrice, formatSigned } from "@/lib/format";
import { CURATED_MARKET_ITEMS } from "@/lib/markets";
import type { BistCompany } from "@/lib/bist";
import type { TimeframeKey } from "@/lib/types";

const US_STOCK_CHIPS = [
  { code: "NVDA", label: "🟢 Nvidia" },
  { code: "AAPL", label: "🍎 Apple" },
  { code: "MSFT", label: "🪟 Microsoft" },
  { code: "TSLA", label: "⚡ Tesla" },
  { code: "AMZN", label: "📦 Amazon" },
  { code: "GOOGL", label: "🔍 Google" },
  { code: "META", label: "♾️ Meta" },
  { code: "AMD", label: "🔴 AMD" },
  { code: "NFLX", label: "🎬 Netflix" },
  { code: "PLTR", label: "🎯 Palantir" },
];

interface UsStockItemData {
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
  usStock?: {
    targetMeanPrice: number | null;
    upsidePercent: number | null;
    recommendationKey: string | null;
    recommendationMean: number | null;
    pe: number | null;
    forwardPe: number | null;
    peg: number | null;
    pb: number | null;
    roe: number | null;
    revenueGrowth: number | null;
    profitMargins: number | null;
    operatingMargins: number | null;
    dividendYield: number | null;
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

function getRecommendationBadge(key: string | null | undefined) {
  if (!key) return null;
  const lower = key.toLowerCase();
  if (lower.includes("strong_buy") || lower === "strongbuy") {
    return <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Güçlü AL</span>;
  }
  if (lower.includes("buy")) {
    return <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">AL (Wall St)</span>;
  }
  if (lower.includes("hold")) {
    return <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">TUT</span>;
  }
  if (lower.includes("sell")) {
    return <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">SAT</span>;
  }
  return <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">{key}</span>;
}

export default function UsStocksDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1d");
  const [data, setData] = useState<UsStockItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30);

  const loadData = async (tf: TimeframeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-summary?market=us_stocks&timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
      }
    } catch (e) {
      console.error("[UsStocksDashboard] Veri çekilemedi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(timeframe);
  }, [timeframe]);

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData(timeframe);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, timeframe]);

  const nvda = data.find((d) => d.ticker === "NVDA");
  const aapl = data.find((d) => d.ticker === "AAPL");
  const msft = data.find((d) => d.ticker === "MSFT");
  const tsla = data.find((d) => d.ticker === "TSLA");

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-indigo-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Amerikan Borsası (NYSE & NASDAQ)
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            S&P 500, Nasdaq Devleri & Analist Hedef Fiyatları
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base leading-relaxed">
            Nvidia, Apple, Microsoft, Tesla ve Wall Street devleri için <strong>Konsensüs Hedef Fiyatlar</strong>, PEG rasyosu, kârlılık çarpanları ve teknik AL/SAT sinyalleri.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <TimeframeSelector
              value={timeframe}
              onChange={setTimeframe}
              size="sm"
              label="Varsayılan Analiz Periyodu"
              description="ABD hisseleri analiz ve grafik varsayılan periyodu"
            />
            <div className="h-8 w-px bg-zinc-800 hidden sm:block self-center" />
            <MailScheduleControl size="sm" market="us_stocks" />
            <MailRecipientsControl size="sm" context="positions" />
            <AutoRefreshControl
              intervalSeconds={refreshInterval}
              onIntervalChange={(sec) => setRefreshInterval(sec)}
              onRefresh={() => void loadData(timeframe)}
              isRefreshing={loading}
              market="us_stocks"
              storageKey="us_stocks_refresh_interval"
              size="sm"
            />
          </div>

          {/* Searchable Combobox for US Stocks */}
          <div className="mt-4 w-full">
            <BistCombobox
              market="us_stocks"
              placeholder="Amerikan hissesi ara (NVDA, Apple, Microsoft, Tesla...)"
              autoNavigate={false}
              onSelect={(company) => setSelectedCompany(company)}
            />
          </div>

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Hızlı erişim:</span>
            {US_STOCK_CHIPS.map((chip) => {
              const isActive = selectedCompany?.ticker === chip.code;
              return (
                <button
                  key={chip.code}
                  type="button"
                  onClick={() => {
                    const curated = CURATED_MARKET_ITEMS[chip.code];
                    setSelectedCompany({
                      code: chip.code,
                      ticker: chip.code,
                      name: curated?.name ?? chip.label,
                      city: "🇺🇸 ABD",
                    });
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                    isActive
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected Asset Live Preview Card */}
      {selectedCompany && (
        <SelectedCompanyPreview
          company={selectedCompany}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Top Mega-Cap Highlights */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[nvda, aapl, msft, tsla].filter(Boolean).map((stock) => {
          if (!stock) return null;
          return (
            <Link
              key={stock.ticker}
              href={`/symbol/${encodeURIComponent(stock.ticker)}`}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-indigo-500/50 hover:bg-zinc-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stock.icon}</span>
                    <span className="font-mono text-xs font-extrabold text-zinc-300">{stock.ticker}</span>
                  </div>
                  <SignalBadge signal={stock.signal} size="sm" />
                </div>
                <div className="mt-1 font-bold text-sm text-zinc-100 truncate">{stock.name}</div>
              </div>

              <div className="my-3">
                <div className="font-mono text-xl font-black text-zinc-100">
                  {formatPrice(stock.price, "USD")}
                </div>
                <div
                  className={`font-mono text-xs font-bold ${
                    stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatSigned(stock.changePercent, 2)}%
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Hedef Fiyat:</span>
                  <strong className="text-zinc-200">
                    {stock.usStock?.targetMeanPrice ? `$${formatNumber(stock.usStock.targetMeanPrice, 1)}` : "—"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Potansiyel:</span>
                  <span
                    className={
                      stock.usStock?.upsidePercent != null && stock.usStock.upsidePercent > 0
                        ? "text-emerald-400 font-bold"
                        : "text-zinc-400"
                    }
                  >
                    {stock.usStock?.upsidePercent != null ? `+${stock.usStock.upsidePercent}%` : "—"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Main US Stocks Table */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Amerikan Borsası Hisseleri & Değerleme Tablosu ({data.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Wall Street analist konsensüs hedefleri, F/K, PEG, kârlılık oranları ve teknik sinyaller.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse py-12 text-center text-xs text-zinc-500">
            Amerikan borsası hisseleri analiz ediliyor...
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Şirket / Sembol</th>
                  <th className="px-3 py-3 text-right">Son Fiyat</th>
                  <th className="px-3 py-3 text-right">Değişim</th>
                  <th className="px-3 py-3 text-center">Sinyal ({timeframe.toUpperCase()})</th>
                  <th className="px-3 py-3 text-center">Wall St. Tavsiyesi</th>
                  <th className="px-3 py-3 text-right">Hedef Fiyat</th>
                  <th className="px-3 py-3 text-right">Yükseliş (%)</th>
                  <th className="px-3 py-3 text-right">F/K (P/E)</th>
                  <th className="px-3 py-3 text-right">PEG</th>
                  <th className="px-3 py-3 text-right">ROE</th>
                  <th className="px-3 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {data.map((item) => {
                  const upside = item.usStock?.upsidePercent;

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
                      <td className="px-3 py-3 text-center">
                        {getRecommendationBadge(item.usStock?.recommendationKey)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-200">
                        {item.usStock?.targetMeanPrice ? `$${formatNumber(item.usStock.targetMeanPrice, 1)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {upside != null ? (
                          <span className={upside > 0 ? "text-emerald-400 font-bold" : "text-red-400"}>
                            {upside > 0 ? `+${upside}%` : `${upside}%`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-300">
                        {item.usStock?.pe != null ? formatNumber(item.usStock.pe, 1) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.usStock?.peg != null ? (
                          <span className={item.usStock.peg < 1.5 ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                            {formatNumber(item.usStock.peg, 2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-300">
                        {item.usStock?.roe != null ? `%${(item.usStock.roe * 100).toFixed(1)}` : "—"}
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

      {/* Active Position Tracking & Live Stop-Loss / Take-Profit Desk */}
      <section id="portfolio-section" className="w-full scroll-mt-20">
        <PositionTracker
          defaultMarket="us_stocks"
          title="Amerikan Borsası Pozisyon Takibi (Stop-Loss & Kâr Al)"
          subtitle="S&P 500 ve Nasdaq hisse pozisyonlarınız için USD bazında anlık stop-loss ve kâr al e-posta alarmları"
        />
      </section>

      {/* Multi-Timeframe Categorized Signals (5m, 15m, 1h, 4h, Günlük, Haftalık) */}
      <section id="signals-section" className="w-full scroll-mt-20">
        <TimeframeSignals
          market="us_stocks"
          title="Amerikan Borsası Çoklu Zaman Dilimi AL/SAT Sinyalleri"
          subtitle="Wall Street devleri için teknik ve temel skorlara dayalı 10 farklı zaman diliminde AL/SAT sinyalleri."
        />
      </section>

      {/* Top Signals Ranking for US Stocks */}
      <section id="top-signals-section" className="w-full scroll-mt-20">
        <TopSignals
          market="us_stocks"
          title="Amerikan Borsası Lider Sinyaller"
          subtitle="S&P 500 ve Nasdaq devleri arasında analist konsensüsü ve teknik puana göre en yüksek AL ve SAT sinyalleri."
        />
      </section>

      {/* TrackList Table (Sinyal Karşılaştırma) */}
      <section id="tracklist-section" className="w-full scroll-mt-20">
        <TrackListTable
          defaultCategory="us_stocks"
          title="Amerikan Borsası Sinyal Performansı (Takip Listem)"
          subtitle="Takibe aldığınız ABD hisselerinin zaman içindeki başarı ve getiri performansı."
        />
      </section>

      {/* Main Watchlist Table */}
      <section id="watchlist-section" className="w-full scroll-mt-20">
        <WatchlistTable
          defaultCategory="us_stocks"
          title="Amerikan Borsası İzleme Listesi"
          subtitle="Takipteki ABD hisselerinde (NVDA, AAPL, MSFT, TSLA...) AL/SAT sinyali değiştiğinde otomatik e-posta tetiklenir."
        />
      </section>
    </div>
  );
}

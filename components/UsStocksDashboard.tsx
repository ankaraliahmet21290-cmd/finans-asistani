"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatNumber, formatPrice, formatSigned } from "@/lib/format";
import { CURATED_MARKET_ITEMS } from "@/lib/markets";
import { US_STOCK_SUBCATEGORY_LABELS, type UsStockSubCategory } from "@/lib/us-stock-assets";
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
  { code: "BRK-B", label: "🏛️ Berkshire" },
  { code: "LLY", label: "💉 Eli Lilly" },
  { code: "JPM", label: "🏦 JPMorgan" },
  { code: "AMD", label: "🔴 AMD" },
  { code: "PLTR", label: "🎯 Palantir" },
  { code: "COIN", label: "🪙 Coinbase" },
  { code: "COST", label: "🏬 Costco" },
  { code: "WMT", label: "🛒 Walmart" },
  { code: "BA", label: "✈️ Boeing" },
  { code: "XOM", label: "🛢️ Exxon" },
  { code: "DIS", label: "🏰 Disney" },
  { code: "NFLX", label: "🎬 Netflix" },
];

const SECTOR_FILTERS = [
  {
    key: "all",
    label: "🌐 Tümü",
    icon: "🌐",
    desc: "Tüm S&P 500 ve Nasdaq liderleri (100+ kurumsal dev)",
  },
  {
    key: "tech",
    label: "💻 Yazılım & Bulut",
    icon: "💻",
    desc: "Microsoft, Google, Oracle, Salesforce, Adobe, Palantir, ServiceNow...",
  },
  {
    key: "semis",
    label: "⚡ Yarı İletken & AI",
    icon: "⚡",
    desc: "Nvidia, AMD, Broadcom, Intel, Qualcomm, Micron, TSMC, ASML...",
  },
  {
    key: "finance",
    label: "🏦 Finans & Banka",
    icon: "🏦",
    desc: "JPMorgan, Visa, Mastercard, Berkshire Hathaway, Bank of America...",
  },
  {
    key: "crypto_fin",
    label: "🪙 Kripto FinTech",
    icon: "🪙",
    desc: "Coinbase, MicroStrategy, Robinhood, PayPal, Block...",
  },
  {
    key: "healthcare",
    label: "💊 Sağlık & İlaç",
    icon: "💊",
    desc: "Eli Lilly, UnitedHealth, Johnson & Johnson, AbbVie, Pfizer...",
  },
  {
    key: "consumer",
    label: "🛒 Tüketici & Perakende",
    icon: "🛒",
    desc: "Tesla, Walmart, Costco, Apple, Coca-Cola, McDonald's, Nike...",
  },
  {
    key: "industrial",
    label: "✈️ Sanayi & Savunma",
    icon: "✈️",
    desc: "Boeing, Lockheed Martin, GE Aerospace, Caterpillar, Deere...",
  },
  {
    key: "energy",
    label: "🛢️ Enerji & Petrol",
    icon: "🛢️",
    desc: "ExxonMobil, Chevron, ConocoPhillips, Schlumberger...",
  },
  {
    key: "media",
    label: "🎬 İletişim & Medya",
    icon: "🎬",
    desc: "Disney, Netflix, Spotify, T-Mobile, Comcast, EA...",
  },
];

type SortKey =
  | "upside"
  | "scoreDesc"
  | "scoreAsc"
  | "changeDesc"
  | "changeAsc"
  | "pe"
  | "peg"
  | "ticker";

interface UsStockItemData {
  ticker: string;
  code: string;
  name: string;
  icon?: string;
  category: string;
  subCategory?: string;
  exchange?: string;
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
    return (
      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        Güçlü AL
      </span>
    );
  }
  if (lower.includes("buy")) {
    return (
      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        AL (Wall St)
      </span>
    );
  }
  if (lower.includes("hold")) {
    return (
      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        TUT
      </span>
    );
  }
  if (lower.includes("sell")) {
    return (
      <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
        SAT
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
      {key}
    </span>
  );
}

export default function UsStocksDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1d");
  const [data, setData] = useState<UsStockItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30);
  const [analystRefreshInterval, setAnalystRefreshInterval] = useState<RefreshInterval>(30);
  const [valuationRefreshInterval, setValuationRefreshInterval] = useState<RefreshInterval>(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("tech");
  const [savedDefaultCategory, setSavedDefaultCategory] = useState("tech");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<"ALL" | "AL" | "SAT" | "TUT">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("upside");

  // Load saved default sector and refresh settings via API and localStorage
  useEffect(() => {
    let active = true;

    // 1. Immediate load from localStorage for zero-lag hydration
    try {
      const saved = localStorage.getItem("us_stock_sector_filter");
      if (saved) {
        setSubCategoryFilter(saved);
        setSavedDefaultCategory(saved);
      }
    } catch {}

    // 2. Fetch server-side setting from us-stock-settings.md
    fetch("/api/settings/us-stocks")
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (json?.settings?.defaultSector) {
          setSubCategoryFilter(json.settings.defaultSector);
          setSavedDefaultCategory(json.settings.defaultSector);
          try {
            localStorage.setItem("us_stock_sector_filter", json.settings.defaultSector);
          } catch {}
        }
      })
      .catch((e) => {
        console.warn("[UsStocksDashboard] Sektör ayarları yüklenemedi:", e);
      });

    // 3. Fetch server-side analyst & valuation refresh settings
    fetch("/api/settings/refresh?market=us_stocks_analyst")
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        const sec = json.config?.markets?.us_stocks_analyst ?? json.effectiveSeconds;
        if (sec !== undefined) setAnalystRefreshInterval(sec as RefreshInterval);
      })
      .catch(() => {});

    fetch("/api/settings/refresh?market=us_stocks_valuation")
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        const sec = json.config?.markets?.us_stocks_valuation ?? json.effectiveSeconds;
        if (sec !== undefined) setValuationRefreshInterval(sec as RefreshInterval);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleSelectSector = async (key: string) => {
    setSubCategoryFilter(key);
    try {
      localStorage.setItem("us_stock_sector_filter", key);
      const res = await fetch("/api/settings/us-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector: key }),
      });
      const json = await res.json();
      if (json?.ok) {
        setSavedDefaultCategory(key);
        const secObj = SECTOR_FILTERS.find((c) => c.key === key);
        setSaveNotice(`${secObj?.label || key} ayarlara kaydedildi`);
        setTimeout(() => setSaveNotice(null), 3500);
      }
    } catch (e) {
      console.warn("[UsStocksDashboard] Sektör ayarı kaydedilemedi:", e);
    }
  };

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

  // Main dashboard auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData(timeframe);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, timeframe]);

  // Analyst consensus auto-refresh timer
  useEffect(() => {
    if (analystRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData(timeframe);
    }, analystRefreshInterval * 1000);
    return () => clearInterval(timer);
  }, [analystRefreshInterval, timeframe]);

  // Valuation table auto-refresh timer
  useEffect(() => {
    if (valuationRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData(timeframe);
    }, valuationRefreshInterval * 1000);
    return () => clearInterval(timer);
  }, [valuationRefreshInterval, timeframe]);

  // Mega-Cap Highlights
  const nvda = data.find((d) => d.ticker === "NVDA");
  const aapl = data.find((d) => d.ticker === "AAPL");
  const msft = data.find((d) => d.ticker === "MSFT");
  const tsla = data.find((d) => d.ticker === "TSLA");

  // Summary Metrics
  const totalCount = data.length;
  const buyCount = data.filter((d) => d.signal === "AL").length;
  const sellCount = data.filter((d) => d.signal === "SAT").length;
  const upsideItems = data.filter(
    (d) => d.usStock?.upsidePercent != null && !isNaN(d.usStock.upsidePercent)
  );
  const avgUpside =
    upsideItems.length > 0
      ? upsideItems.reduce((acc, cur) => acc + (cur.usStock?.upsidePercent ?? 0), 0) /
        upsideItems.length
      : 0;

  // Filtered and Sorted Data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Subcategory Filter
    if (subCategoryFilter !== "all") {
      result = result.filter((d) => d.subCategory === subCategoryFilter);
    }

    // Signal Filter
    if (signalFilter !== "ALL") {
      result = result.filter((d) => d.signal === signalFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.ticker.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.code?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "upside": {
          const upA = a.usStock?.upsidePercent ?? -Infinity;
          const upB = b.usStock?.upsidePercent ?? -Infinity;
          return upB - upA;
        }
        case "scoreDesc":
          return b.score - a.score;
        case "scoreAsc":
          return a.score - b.score;
        case "changeDesc":
          return b.changePercent - a.changePercent;
        case "changeAsc":
          return a.changePercent - b.changePercent;
        case "pe": {
          const peA = a.usStock?.pe ?? Infinity;
          const peB = b.usStock?.pe ?? Infinity;
          return peA - peB;
        }
        case "peg": {
          const pegA = a.usStock?.peg ?? Infinity;
          const pegB = b.usStock?.peg ?? Infinity;
          return pegA - pegB;
        }
        case "ticker":
          return a.ticker.localeCompare(b.ticker);
        default:
          return 0;
      }
    });

    return result;
  }, [data, subCategoryFilter, signalFilter, searchQuery, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-indigo-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            100+ Amerikan Şirketi · NYSE & NASDAQ Devleri
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            S&P 500 & Nasdaq Hisseleri Karar Destek
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base leading-relaxed">
            Nvidia, Apple, Microsoft, Tesla ve Wall Street devleri için{" "}
            <strong>Konsensüs Hedef Fiyatlar</strong>, analist tavsiyeleri, PEG &amp; F/K rasyoları ve çoklu zaman dilimi AL/SAT sinyalleri.
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
              placeholder="Amerikan hissesi ara veya sembol yaz (NVDA, Apple, Berkshire, LLY, JPM, TSLA...)"
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

      {/* Wall Street Analist Konsensüsü & Mega-Cap Liderler Header */}
      <div id="us-analyst-section" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between scroll-mt-20">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="text-base sm:text-lg">🎯</span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100">
              Wall Street Analist Konsensüsü &amp; Mega-Cap Liderler
            </h2>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
              12 Aylık Hedef
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Goldman Sachs, Morgan Stanley, JPMorgan vb. Wall Street analist konsensüs hedefleri ve getiri potansiyelleri.
          </p>
        </div>

        <AutoRefreshControl
          intervalSeconds={analystRefreshInterval}
          onIntervalChange={(sec) => setAnalystRefreshInterval(sec)}
          onRefresh={() => void loadData(timeframe)}
          isRefreshing={loading}
          market="us_stocks_analyst"
          storageKey="us_stocks_analyst_refresh_interval"
          size="sm"
        />
      </div>

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
                    <span className="font-mono text-xs font-extrabold text-zinc-300">
                      {stock.ticker}
                    </span>
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
                    {stock.usStock?.targetMeanPrice
                      ? `$${formatNumber(stock.usStock.targetMeanPrice, 1)}`
                      : "—"}
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

      {/* Summary Metrics Overview */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">Taranan ABD Şirketleri</div>
          <div className="mt-1 font-mono text-xl font-black text-zinc-100">
            {loading ? "..." : `${totalCount} Şirket`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">S&P 500 &amp; Nasdaq Ekosistemi</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">🟢 AL Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-emerald-400">
            {loading ? "..." : `${buyCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((buyCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Teknik &amp; analist pozitif</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">🔴 SAT Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-red-400">
            {loading ? "..." : `${sellCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((sellCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Düşüş eğilimi / kâr realizasyonu</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">Ortalama Wall St. Potansiyeli</div>
          <div
            className={`mt-1 font-mono text-xl font-black ${
              avgUpside >= 0 ? "text-emerald-400" : "text-zinc-300"
            }`}
          >
            {loading ? "..." : `+${avgUpside.toFixed(1)}%`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Konsensüs analist hedefleri</div>
        </div>
      </section>

      {/* Main US Stocks Table */}
      <section id="us-valuation-table-section" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md scroll-mt-20">
        {/* Table Header & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex flex-wrap items-center gap-2">
              <span>Amerikan Borsası Hisseleri &amp; Değerleme Tablosu</span>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-xs text-indigo-400 font-semibold">
                {filteredData.length} / {totalCount}
              </span>
              <span
                title="Varsayılan Sektör / Sekme: ABD borsası ekranı açıldığında doğrudan seçilecek sektör (us-stock-settings.md)"
                className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300"
              >
                <span>⚙️</span>
                <span>
                  Varsayılan Sektör:{" "}
                  {SECTOR_FILTERS.find((c) => c.key === savedDefaultCategory)?.label ?? "💻 Yazılım & Bulut"}
                </span>
              </span>
              {saveNotice && (
                <span className="animate-pulse rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                  ✓ {saveNotice}
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Wall Street analist konsensüs hedefleri, F/K, PEG, kârlılık oranları ve teknik sinyaller.
            </p>
          </div>

          {/* Table Search & AutoRefresh Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Listede filtrele (Apple, LLY, Nvidia, JPM...)"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <AutoRefreshControl
              intervalSeconds={valuationRefreshInterval}
              onIntervalChange={(sec) => setValuationRefreshInterval(sec)}
              onRefresh={() => void loadData(timeframe)}
              isRefreshing={loading}
              market="us_stocks_valuation"
              storageKey="us_stocks_valuation_refresh_interval"
              size="sm"
            />
          </div>
        </div>

        {/* Sector Tabs & Filter Controls */}
        <div className="mt-4 flex flex-col gap-3">
          {/* Sector / Subcategory Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SECTOR_FILTERS.map((sec) => {
              const isActive = subCategoryFilter === sec.key;
              const isDefault = savedDefaultCategory === sec.key;
              const count =
                sec.key === "all"
                  ? data.length
                  : data.filter((d) => d.subCategory === sec.key).length;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleSelectSector(sec.key)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  title={`${sec.label}: ${sec.desc} (Seçildiğinde varsayılan olarak kaydedilir)`}
                >
                  <span className="mr-1">{sec.icon}</span>
                  {sec.label}
                  <span className="ml-1.5 text-[10px] text-zinc-500 font-mono">({count})</span>
                  {isDefault && (
                    <span className="ml-1 text-[10px] text-amber-400 font-mono" title="Açılış varsayılanı">
                      ★
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-bar: Signal filter & Sort */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Signal filter buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500 mr-1">Sinyal:</span>
              {(["ALL", "AL", "TUT", "SAT"] as const).map((sig) => {
                const isSigActive = signalFilter === sig;
                return (
                  <button
                    key={sig}
                    type="button"
                    onClick={() => setSignalFilter(sig)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                      isSigActive
                        ? sig === "AL"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : sig === "SAT"
                          ? "bg-red-500 text-white font-bold"
                          : sig === "TUT"
                          ? "bg-amber-500 text-zinc-950 font-bold"
                          : "bg-zinc-200 text-zinc-900 font-bold"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {sig === "ALL" ? "Tümü" : sig}
                  </button>
                );
              })}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sıralama ölçütü"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="upside">🎯 En Yüksek Yükseliş Potansiyeli</option>
                <option value="scoreDesc">⭐ En Yüksek Skor</option>
                <option value="scoreAsc">⚠️ En Düşük Skor</option>
                <option value="changeDesc">📈 En Çok Yükselenler (%)</option>
                <option value="changeAsc">📉 En Çok Düşenler (%)</option>
                <option value="pe">💎 En Düşük F/K (P/E)</option>
                <option value="peg">🚀 En Cazip PEG</option>
                <option value="ticker">🔤 Sembol (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse py-12 text-center text-xs text-zinc-500">
            Amerikan borsası hisseleri analiz ediliyor...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Seçilen filtrelere uygun ABD hissesi bulunamadı.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto touch-scroll scrollbar-none">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Şirket / Sembol</th>
                  <th className="px-3 py-3">Borsa / Sektör</th>
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
                {filteredData.map((item) => {
                  const upside = item.usStock?.upsidePercent;
                  const secLabel = item.subCategory
                    ? US_STOCK_SUBCATEGORY_LABELS[item.subCategory as UsStockSubCategory]?.label
                    : undefined;

                  return (
                    <tr key={item.ticker} className="transition hover:bg-zinc-800/40">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{item.icon ?? "🇺🇸"}</span>
                          <div>
                            <div className="font-bold text-zinc-100">{item.name}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{item.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-zinc-300 text-[11px] font-medium">
                          {secLabel ?? "Amerikan Pazarı"}
                        </div>
                        {item.exchange && (
                          <span className="font-mono text-[10px] text-zinc-500">
                            {item.exchange}
                          </span>
                        )}
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
                        {item.usStock?.targetMeanPrice
                          ? `$${formatNumber(item.usStock.targetMeanPrice, 1)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {upside != null ? (
                          <span
                            className={
                              upside > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"
                            }
                          >
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
                          <span
                            className={
                              item.usStock.peg < 1.5
                                ? "text-emerald-400 font-bold"
                                : "text-zinc-400"
                            }
                          >
                            {formatNumber(item.usStock.peg, 2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-300">
                        {item.usStock?.roe != null
                          ? `%${(item.usStock.roe * 100).toFixed(1)}`
                          : "—"}
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
          subtitle="Takipteki ABD hisselerinde (NVDA, AAPL, MSFT, TSLA, LLY...) AL/SAT sinyali değiştiğinde otomatik e-posta tetiklenir."
        />
      </section>
    </div>
  );
}

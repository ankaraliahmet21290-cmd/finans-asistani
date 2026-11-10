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
import { formatNumber, formatPrice, formatSigned } from "@/lib/format";
import { CURATED_MARKET_ITEMS } from "@/lib/markets";
import type { BistCompany } from "@/lib/bist";
import type { TimeframeKey } from "@/lib/types";

const CRYPTO_CHIPS = [
  { code: "BTC-USD", label: "₿ Bitcoin" },
  { code: "ETH-USD", label: "Ξ Ethereum" },
  { code: "SOL-USD", label: "◎ Solana" },
  { code: "SUI20947-USD", label: "💧 Sui" },
  { code: "PEPE24478-USD", label: "🐸 Pepe" },
  { code: "TAO22974-USD", label: "🧠 Bittensor" },
  { code: "RENDER-USD", label: "🎨 Render" },
  { code: "AVAX-USD", label: "🔺 Avalanche" },
  { code: "DOGE-USD", label: "🐕 Dogecoin" },
  { code: "NEAR-USD", label: "🌐 NEAR" },
  { code: "BNB-USD", label: "🟡 BNB" },
  { code: "XRP-USD", label: "✕ Ripple" },
  { code: "UNI7083-USD", label: "🦄 Uniswap" },
  { code: "AAVE-USD", label: "👻 Aave" },
];

interface CryptoItemData {
  ticker: string;
  code?: string;
  name: string;
  icon?: string;
  category: string;
  subCategory?: string;
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

const SUBCATEGORY_FILTERS = [
  {
    key: "major",
    label: "🔥 Liderler",
    icon: "🔥",
    desc: "BTC, ETH, SOL, BNB, XRP gibi en yüksek piyasa değerine sahip lider kripto varlıklar",
  },
  {
    key: "all",
    label: "🌐 Tümü",
    icon: "🌐",
    desc: "Tüm ekosistem genelindeki taranan kripto varlıklar (80+ varlık)",
  },
  {
    key: "layer1",
    label: "⚡ Ana Ağlar (Layer 1)",
    icon: "⚡",
    desc: "Kendi bağımsız blokzincirine sahip Katman-1 ana ağları (Sui, Aptos, Sei, Injective, Celestia vb.)",
  },
  {
    key: "layer2",
    label: "🚀 Hızlandırma & Rollup (Layer 2)",
    icon: "🚀",
    desc: "Ana ağları hızlandırıp transfer komisyonlarını düşüren ikinci katman ölçekleme ağları (Arbitrum, Optimism, Starknet, Stacks vb.)",
  },
  {
    key: "ai",
    label: "🤖 Yapay Zeka (AI)",
    icon: "🤖",
    desc: "Yapay zeka modelleri, makine öğrenimi ve merkeziyetsiz veri-hesaplama tokenları (TAO, Render, FET vb.)",
  },
  {
    key: "defi",
    label: "🏦 DeFi & Finans",
    icon: "🏦",
    desc: "Merkeziyetsiz finans, borsa (DEX), borç alma/verme ve getiri protokolleri (Aave, Uniswap, Maker vb.)",
  },
  {
    key: "meme",
    label: "🐕 Meme Coinler",
    icon: "🐕",
    desc: "Topluluk ve viral akımlarla hareket eden yüksek volatiliteli paralar (Pepe, Doge, Shiba, Bonk vb.)",
  },
  {
    key: "gaming",
    label: "🎮 Web3 & Oyun",
    icon: "🎮",
    desc: "GameFi, Metaverse ve sanal dünya tokenları (ImmutableX, Gala, Sandbox vb.)",
  },
  {
    key: "infra",
    label: "🔒 Altyapı & Gizlilik",
    icon: "🔒",
    desc: "Oracle, merkeziyetsiz depolama, köprü ve gizlilik odaklı altyapı ağları (Chainlink, Filecoin, Monero vb.)",
  },
];

type SortKey = "mcap" | "scoreDesc" | "scoreAsc" | "changeDesc" | "changeAsc" | "priceDesc" | "rsi" | "ath";

export default function CryptoDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("4h");
  const [data, setData] = useState<CryptoItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("major");
  const [savedDefaultCategory, setSavedDefaultCategory] = useState("major");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<"ALL" | "AL" | "SAT" | "TUT">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("mcap");
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(15);
  const [viewMode, setViewMode] = useState<"auto" | "cards" | "table">("auto");

  // Load saved default category from crypto-settings.md via API and localStorage
  useEffect(() => {
    let active = true;

    // 1. Immediate load from localStorage for zero-lag hydration
    try {
      const saved = localStorage.getItem("crypto_subcategory_filter");
      if (saved && SUBCATEGORY_FILTERS.some((c) => c.key === saved)) {
        setSubCategoryFilter(saved);
        setSavedDefaultCategory(saved);
      }
    } catch {
      // ignore
    }

    // 2. Fetch server-side setting from crypto-settings.md
    fetch("/api/settings/crypto")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.ok || !json.settings?.defaultCategory) return;
        const cat = json.settings.defaultCategory;
        if (SUBCATEGORY_FILTERS.some((c) => c.key === cat)) {
          setSubCategoryFilter(cat);
          setSavedDefaultCategory(cat);
          try {
            localStorage.setItem("crypto_subcategory_filter", cat);
          } catch {
            // ignore
          }
        }
      })
      .catch((e) => {
        console.warn("[CryptoDashboard] Kripto ayarları yüklenemedi:", e);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSelectSubCategory = async (key: string) => {
    setSubCategoryFilter(key);
    try {
      localStorage.setItem("crypto_subcategory_filter", key);
    } catch {
      // ignore
    }

    // Persist to crypto-settings.md via API
    try {
      const res = await fetch("/api/settings/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: key }),
      });
      if (res.ok) {
        setSavedDefaultCategory(key);
        const catObj = SUBCATEGORY_FILTERS.find((c) => c.key === key);
        setSaveNotice(`${catObj?.label || key} ayarlara kaydedildi`);
        setTimeout(() => setSaveNotice(null), 3500);
      }
    } catch (e) {
      console.warn("[CryptoDashboard] Kripto ayarı kaydedilemedi:", e);
    }
  };

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

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void loadData(timeframe);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, timeframe]);

  const btc = data.find((d) => d.ticker === "BTC-USD");
  const eth = data.find((d) => d.ticker === "ETH-USD");
  const sol = data.find((d) => d.ticker === "SOL-USD");

  // Summary statistics
  const totalCount = data.length;
  const buyCount = data.filter((d) => d.signal === "AL").length;
  const sellCount = data.filter((d) => d.signal === "SAT").length;
  const holdCount = data.filter((d) => d.signal === "TUT").length;
  const avgChange =
    totalCount > 0 ? data.reduce((acc, d) => acc + (d.changePercent || 0), 0) / totalCount : 0;

  // Filtered & Sorted items
  const filteredData = data
    .filter((item) => {
      // 1. Subcategory filter
      if (subCategoryFilter !== "all" && item.subCategory !== subCategoryFilter) {
        return false;
      }
      // 2. Signal filter
      if (signalFilter !== "ALL" && item.signal !== signalFilter) {
        return false;
      }
      // 3. Search query (ticker, code, name, or subcategory)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicker = item.ticker.toLowerCase().includes(q);
        const matchCode = (item.code || "").toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchSub = (item.subCategory || "").toLowerCase().includes(q);
        return matchTicker || matchCode || matchName || matchSub;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "mcap": {
          const capA = a.crypto?.marketCap ?? 0;
          const capB = b.crypto?.marketCap ?? 0;
          return capB - capA;
        }
        case "scoreDesc":
          return b.score - a.score;
        case "scoreAsc":
          return a.score - b.score;
        case "changeDesc":
          return b.changePercent - a.changePercent;
        case "changeAsc":
          return a.changePercent - b.changePercent;
        case "priceDesc":
          return b.price - a.price;
        case "rsi": {
          const rsiA = a.indicators?.rsi ?? 50;
          const rsiB = b.indicators?.rsi ?? 50;
          return rsiB - rsiA;
        }
        case "ath": {
          const athA = a.crypto?.athDropPercent ?? -100;
          const athB = b.crypto?.athDropPercent ?? -100;
          return athB - athA;
        }
        default:
          return 0;
      }
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            80+ Kripto Varlık · 7/24 Kesintisiz Seans
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Tüm Kripto Varlıklar & 7/24 Karar Destek
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base leading-relaxed">
            Bitcoin, Ethereum, Solana, Layer 1/2, AI, DeFi ve meme paralar için <strong>7/24 dinamik trend takibi (Supertrend, Stoch RSI)</strong>, likidite rasyoları ve ATH mesafe göstergeleri.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <TimeframeSelector
              value={timeframe}
              onChange={setTimeframe}
              size="sm"
              label="Varsayılan Analiz Periyodu"
              description="Kripto analiz ve sinyal varsayılan periyodu"
            />
            <div className="h-8 w-px bg-zinc-800 hidden sm:block self-center" />
            <MailScheduleControl size="sm" market="crypto" />
            <MailRecipientsControl size="sm" context="positions" />
            <AutoRefreshControl
              intervalSeconds={refreshInterval}
              onIntervalChange={(sec) => setRefreshInterval(sec)}
              onRefresh={() => void loadData(timeframe)}
              isRefreshing={loading}
              market="crypto"
              storageKey="crypto_refresh_interval"
              size="sm"
            />
          </div>

          {/* Searchable Combobox for Crypto */}
          <div className="mt-4 w-full">
            <BistCombobox
              market="crypto"
              placeholder="Tüm kripto varlıklarda ara (BTC, Pepe, Solana, Bittensor, Render, Sui...)"
              autoNavigate={false}
              onSelect={(company) => setSelectedCompany(company)}
            />
          </div>

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Hızlı erişim:</span>
            {CRYPTO_CHIPS.map((chip) => {
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
                      city: "🪙 Kripto",
                    });
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                    isActive
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
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

      {/* Market Stats Overview */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">Taranan Kripto Varlık</div>
          <div className="mt-1 font-mono text-xl font-black text-zinc-100">
            {loading ? "..." : `${totalCount} Varlık`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Tüm ekosistem taranıyor</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">🟢 AL Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-emerald-400">
            {loading ? "..." : `${buyCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((buyCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Pozitif momentum & trend</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">🔴 SAT Sinyali Verenler</div>
          <div className="mt-1 font-mono text-xl font-black text-red-400">
            {loading ? "..." : `${sellCount}`}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({totalCount > 0 ? ((sellCount / totalCount) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Düşüş trendi & stop-loss</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">24s Ortalama Değişim</div>
          <div
            className={`mt-1 font-mono text-xl font-black ${
              avgChange >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {loading ? "..." : `${formatSigned(avgChange, 2)}%`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Piyasa genel eğilimi</div>
        </div>
      </section>

      {/* Main Crypto Assets Table & Controls */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex flex-wrap items-center gap-2">
              <span>Tüm Kripto Varlıklar & Karar Destek Skorları</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400 font-semibold">
                {filteredData.length} / {totalCount}
              </span>
              <span
                title="Varsayılan Kategori / Sekme: Kripto ekranı açıldığında doğrudan seçilecek kategori (crypto-settings.md)"
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
              >
                <span>⚙️</span>
                <span>Varsayılan Kategori: {SUBCATEGORY_FILTERS.find((c) => c.key === savedDefaultCategory)?.label ?? "🔥 Liderler"}</span>
              </span>
              {saveNotice && (
                <span className="animate-pulse rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  ✓ {saveNotice}
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Teknik momentum, RSI, 24s likidite ve ATH mesafe göstergeleri ile anlık AL/SAT/TUT sinyalleri.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Listede filtrele (Pepe, Solana, BTC...)"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
        </div>

        {/* Category Tabs & Signal Filter Controls */}
        <div className="mt-4 flex flex-col gap-3">
          {/* Subcategory Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SUBCATEGORY_FILTERS.map((cat) => {
              const isActive = subCategoryFilter === cat.key;
              const isDefault = savedDefaultCategory === cat.key;
              const count =
                cat.key === "all"
                  ? data.length
                  : data.filter((d) => d.subCategory === cat.key).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleSelectSubCategory(cat.key)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  title={`${cat.label}: ${cat.desc} (Seçildiğinde varsayılan olarak kaydedilir)`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                  <span className="ml-1.5 text-[10px] text-zinc-500 font-mono">({count})</span>
                  {isDefault && (
                    <span className="ml-1 text-[10px] text-amber-400 font-mono" title="Açılış varsayılanı">★</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Category Explanation Note */}
          {(() => {
            const activeCat = SUBCATEGORY_FILTERS.find((c) => c.key === subCategoryFilter);
            if (!activeCat || !activeCat.desc) return null;
            return (
              <div className="flex items-center gap-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
                <span className="font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                  <span>{activeCat.icon}</span>
                  <span>{activeCat.label}:</span>
                </span>
                <span className="text-zinc-400">{activeCat.desc}</span>
              </div>
            );
          })()}

          {/* Secondary Filter Row: Signal filter & Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/60 text-xs">
            {/* Signal filter buttons */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-[11px] mr-1">Sinyal:</span>
              <button
                type="button"
                onClick={() => setSignalFilter("ALL")}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  signalFilter === "ALL"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Tümü ({data.length})
              </button>
              <button
                type="button"
                onClick={() => setSignalFilter("AL")}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  signalFilter === "AL"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-emerald-400"
                }`}
              >
                🟢 Sadece AL ({buyCount})
              </button>
              <button
                type="button"
                onClick={() => setSignalFilter("SAT")}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  signalFilter === "SAT"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "text-zinc-400 hover:text-red-400"
                }`}
              >
                🔴 Sadece SAT ({sellCount})
              </button>
              <button
                type="button"
                onClick={() => setSignalFilter("TUT")}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  signalFilter === "TUT"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-zinc-400 hover:text-amber-400"
                }`}
              >
                🟡 TUT ({holdCount})
              </button>
            </div>

            {/* Sorting selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="mcap">Piyasa Değeri (Büyükten Küçüğe)</option>
                <option value="scoreDesc">Karar Skoru (En Yüksek AL)</option>
                <option value="scoreAsc">Karar Skoru (En Yüksek SAT)</option>
                <option value="changeDesc">24s Değişim (% En Çok Artan)</option>
                <option value="changeAsc">24s Değişim (% En Çok Düşen)</option>
                <option value="priceDesc">Fiyat (Yüksekten Düşüğe)</option>
                <option value="rsi">RSI (14) Değeri</option>
                <option value="ath">52H Zirveye En Yakın</option>
              </select>
            </div>

            {/* View Mode Toggle (Mobile / Desktop) */}
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "cards" ? "auto" : "cards")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                  viewMode === "cards"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Kart Görünümü"
              >
                📱 Kart
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "table" ? "auto" : "table")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                  viewMode === "table"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Geniş Tablo Görünümü"
              >
                💻 Tablo
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse py-16 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span>Tüm kripto para piyasaları canlı taranıyor (80+ varlık)...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Arama kriterine uygun kripto varlık bulunamadı.
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* 1. MOBILE RESPONSIVE CARDS VIEW                                */}
            {/* Displayed on mobile (< md) or when user toggles cards view      */}
            {/* ============================================================== */}
            <div
              className={`${
                viewMode === "table" ? "hidden" : viewMode === "cards" ? "grid" : "grid md:hidden"
              } mt-4 grid-cols-1 sm:grid-cols-2 gap-3`}
            >
              {filteredData.map((item) => {
                const isUp = item.changePercent >= 0;
                const volMcap = item.crypto?.volumeToMarketCap;
                const isHighLiquidity = volMcap != null && volMcap > 0.08;

                return (
                  <div
                    key={item.ticker}
                    className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 shadow-md backdrop-blur-md transition hover:border-zinc-700"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/symbol/${encodeURIComponent(item.ticker)}`}
                              className="font-mono text-sm font-bold text-emerald-400 hover:text-emerald-300 transition"
                            >
                              {item.name}
                            </Link>
                            {item.code && (
                              <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-zinc-400 border border-zinc-700/60">
                                {item.code}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500">{item.ticker}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <SignalBadge signal={item.signal} size="sm" />
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                            item.score > 0.3
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.score < -0.3
                              ? "bg-red-500/20 text-red-400"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          Skor: {formatSigned(item.score, 2)}
                        </span>
                      </div>
                    </div>

                    {/* Price & Change Banner */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950/70 p-2.5 border border-zinc-800/60">
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-zinc-500">Fiyat (USD)</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="font-mono text-base font-bold text-zinc-100">
                            {formatPrice(item.price, "USD")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-semibold text-zinc-500">24s Değişim</span>
                        <span className={`block font-mono text-base font-bold mt-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {formatSigned(item.changePercent, 2)}%
                        </span>
                      </div>
                    </div>

                    {/* Stats 4-box */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs border-t border-zinc-800/40 pt-2 font-mono">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="text-[10px] text-zinc-500 font-sans">Piyasa Değeri:</span>
                        <strong className="text-zinc-200">{formatCryptoCap(item.crypto?.marketCap)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="text-[10px] text-zinc-500 font-sans">24s Hacim/MCap:</span>
                        <strong className={isHighLiquidity ? "text-emerald-400 font-bold" : "text-zinc-200"}>
                          {volMcap != null ? `%${(volMcap * 100).toFixed(1)}` : "—"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="text-[10px] text-zinc-500 font-sans">RSI (14):</span>
                        <strong
                          className={
                            item.indicators?.rsi != null && item.indicators.rsi >= 70
                              ? "text-amber-400 font-bold"
                              : item.indicators?.rsi != null && item.indicators.rsi <= 30
                              ? "text-emerald-400 font-bold"
                              : "text-zinc-200"
                          }
                        >
                          {item.indicators?.rsi != null ? formatNumber(item.indicators.rsi, 1) : "—"}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="text-[10px] text-zinc-500 font-sans">52H Zirveden:</span>
                        <strong className="text-amber-400/90">
                          {item.crypto?.athDropPercent != null ? `${item.crypto.athDropPercent.toFixed(1)}%` : "—"}
                        </strong>
                      </div>
                    </div>

                    {/* Reasoning Tag */}
                    <div className="mt-2 text-[11px] text-zinc-400 truncate bg-zinc-950/40 rounded-lg px-2 py-1 border border-zinc-800/40">
                      💡 {item.reasons[0] || "7/24 Kesintisiz Piyasa"}
                    </div>

                    {/* Action Button */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/40">
                      <Link
                        href={`/symbol/${encodeURIComponent(item.ticker)}`}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 active:scale-95 transition"
                      >
                        <span>Detaylı Kripto Grafik & Göstergeler</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================== */}
            {/* 2. DESKTOP FULL TABLE VIEW                                     */}
            {/* Displayed on desktop (>= md) or when user toggles table view   */}
            {/* ============================================================== */}
            <div
              className={`${
                viewMode === "cards" ? "hidden" : viewMode === "table" ? "block" : "hidden md:block"
              } mt-4 overflow-x-auto touch-scroll scrollbar-none rounded-xl border border-zinc-800/80`}
            >
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                  <tr>
                    <th className="px-3 py-3">Kripto Varlık</th>
                    <th className="px-3 py-3 text-right">Fiyat (USD)</th>
                    <th className="px-3 py-3 text-right">24s Değişim</th>
                    <th className="px-3 py-3 text-center">Sinyal ({timeframe.toUpperCase()})</th>
                    <th className="px-3 py-3 text-center">Skor</th>
                    <th className="px-3 py-3 text-right">Piyasa Değeri</th>
                    <th className="px-3 py-3 text-right">24s Hacim/MCap</th>
                    <th className="px-3 py-3 text-right">52H Zirveden</th>
                    <th className="px-3 py-3 text-right">RSI (14)</th>
                    <th className="px-3 py-3">Teknik Durum</th>
                    <th className="px-3 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredData.map((item) => {
                    const volMcap = item.crypto?.volumeToMarketCap;
                    const isHighLiquidity = volMcap != null && volMcap > 0.08;

                    return (
                      <tr key={item.ticker} className="transition hover:bg-zinc-800/40">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl flex-shrink-0">{item.icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-zinc-100">{item.name}</span>
                                {item.code && (
                                  <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-zinc-400 border border-zinc-700/60">
                                    {item.code}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-zinc-500">{item.ticker}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100 whitespace-nowrap">
                          {formatPrice(item.price, "USD")}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${
                            item.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatSigned(item.changePercent, 2)}%
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <SignalBadge signal={item.signal} size="sm" />
                        </td>
                        <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                              item.score > 0.3
                                ? "bg-emerald-500/20 text-emerald-400"
                                : item.score < -0.3
                                ? "bg-red-500/20 text-red-400"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {formatSigned(item.score, 2)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                          {formatCryptoCap(item.crypto?.marketCap)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                          {volMcap != null ? (
                            <span className={isHighLiquidity ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                              %{(volMcap * 100).toFixed(1)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-amber-400/90 font-semibold whitespace-nowrap">
                          {item.crypto?.athDropPercent != null ? `${item.crypto.athDropPercent.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
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
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/symbol/${encodeURIComponent(item.ticker)}`}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-500 hover:text-white transition inline-block"
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
          </>
        )}
      </section>

      {/* Active Position Tracking & Live Stop-Loss / Take-Profit Desk */}
      <section id="portfolio-section" className="w-full scroll-mt-20">
        <PositionTracker
          defaultMarket="crypto"
          title="Kripto Para Pozisyon Takibi (Stop-Loss & Kâr Al)"
          subtitle="7/24 kesintisiz kripto portföyünüz için anlık zarar durdur (stop-loss) ve kâr al e-posta alarmları"
        />
      </section>

      {/* Multi-Timeframe Categorized Signals (5m, 15m, 1h, 4h, Günlük, Haftalık) */}
      <section id="signals-section" className="w-full scroll-mt-20">
        <TimeframeSignals
          market="crypto"
          title="Kripto Para Çoklu Zaman Dilimi AL/SAT Sinyalleri"
          subtitle="Bitcoin, Ethereum ve önde gelen altcoinler için 7/24 dinamik trend sinyalleri."
        />
      </section>

      {/* Top Signals Ranking for Crypto */}
      <section id="top-signals-section" className="w-full scroll-mt-20">
        <TopSignals
          market="crypto"
          title="Kripto Para Lider Sinyaller"
          subtitle="Kripto ekosisteminde teknik momentum ve trend gücüne göre en yüksek AL ve SAT sinyalleri."
        />
      </section>

      {/* TrackList Table (Sinyal Karşılaştırma) */}
      <section id="tracklist-section" className="w-full scroll-mt-20">
        <TrackListTable
          defaultCategory="crypto"
          title="Kripto Para Sinyal Performansı (Takip Listem)"
          subtitle="Takibe aldığınız kripto para sinyallerinin zaman içindeki başarı ve getiri performansı."
        />
      </section>

      {/* Main Watchlist Table */}
      <section id="watchlist-section" className="w-full scroll-mt-20">
        <WatchlistTable
          defaultCategory="crypto"
          title="Kripto Para İzleme Listesi"
          subtitle="Takipteki coinlerde (BTC, ETH, SOL...) AL/SAT sinyali değiştiğinde 7/24 otomatik e-posta tetiklenir."
        />
      </section>
    </div>
  );
}

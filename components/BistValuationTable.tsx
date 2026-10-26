"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import { formatNumber, formatPrice, formatSigned } from "@/lib/format";
import {
  BIST_SECTOR_FILTERS,
  getBistSector,
  getBistSectorLabel,
  isBist30,
  isBist100,
  type BistSectorKey,
} from "@/lib/bist-sectors";
import type { BistMarketItem } from "./BistAnalystHighlights";
import type { TimeframeKey } from "@/lib/timeframes";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";

type SortKey =
  | "upside"
  | "scoreDesc"
  | "scoreAsc"
  | "changeDesc"
  | "changeAsc"
  | "pe"
  | "pb"
  | "roe"
  | "ticker";

const BIST_ICONS: Record<string, string> = {
  THYAO: "✈️",
  PGSUS: "🛫",
  TAVHL: "🛄",
  ASELS: "🛡️",
  ALTNY: "🛰️",
  GARAN: "🏦",
  AKBNK: "🏧",
  ISCTR: "💳",
  YKBNK: "🏦",
  VAKBN: "🏛️",
  HALKB: "🪙",
  ALBRK: "🏦",
  TSKB: "🏢",
  TUPRS: "🛢️",
  PETKM: "🧪",
  ASTOR: "⚡",
  AKSEN: "🔌",
  ENJSA: "💡",
  CWENE: "☀️",
  ENERY: "🔥",
  GWIND: "💨",
  ODAS: "⛏️",
  ZOREN: "⚡",
  EREGL: "🏗️",
  KRDMD: "🔩",
  ISDMR: "🏭",
  FROTO: "🚗",
  TOASO: "🚙",
  TTRAK: "🚜",
  DOAS: "🏎️",
  KARSN: "🚌",
  ARCLK: "🧺",
  VESTL: "📺",
  SISE: "🥛",
  CIMSA: "🧱",
  AKCNS: "🧱",
  BTCIM: "🧱",
  OYAKC: "🏗️",
  KCHOL: "🏛️",
  SAHOL: "🏢",
  AGHOL: "🌐",
  ALARK: "🏗️",
  ENKAI: "🗼",
  DOHOL: "📰",
  BERA: "📦",
  BIMAS: "🛒",
  MGROS: "🛍️",
  SOKM: "🏪",
  CCOLA: "🥤",
  AEFES: "🍺",
  ULKER: "🍫",
  TABGD: "🍔",
  TUKAS: "🥫",
  MAVI: "👖",
  TCELL: "📡",
  TTKOM: "📞",
  EKGYO: "🏘️",
  TRGYO: "🏢",
  ISGYO: "🏬",
  RGYAS: "🏬",
  SASA: "🧵",
  AKSA: "🧶",
  GUBRF: "🌱",
  HEKTS: "🌾",
  OTKAR: "🛡️",
  LOGO: "💻",
  MIATK: "🖥️",
  REEDR: "📱",
  MPARK: "🏥",
};

function getRecommendationBadge(key: string | null | undefined, opinions?: number | null) {
  if (!key) return <span className="text-zinc-500">—</span>;
  const lower = key.toLowerCase();
  const countLabel = opinions ? ` · ${opinions}` : "";

  if (lower.includes("strong_buy") || lower === "strongbuy") {
    return (
      <span
        title={`Konsensüs: Güçlü AL${opinions ? ` (${opinions} Analist)` : ""}`}
        className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 whitespace-nowrap"
      >
        Güçlü AL{countLabel}
      </span>
    );
  }
  if (lower.includes("buy")) {
    return (
      <span
        title={`Konsensüs: AL${opinions ? ` (${opinions} Analist)` : ""}`}
        className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 whitespace-nowrap"
      >
        AL{countLabel}
      </span>
    );
  }
  if (lower.includes("hold")) {
    return (
      <span
        title={`Konsensüs: TUT${opinions ? ` (${opinions} Analist)` : ""}`}
        className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400 whitespace-nowrap"
      >
        TUT{countLabel}
      </span>
    );
  }
  if (lower.includes("sell") || lower.includes("underperform")) {
    return (
      <span
        title={`Konsensüs: SAT / Zayıf${opinions ? ` (${opinions} Analist)` : ""}`}
        className="inline-flex items-center rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400 whitespace-nowrap"
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

export interface BistValuationTableProps {
  items: BistMarketItem[];
  loading?: boolean;
  timeframe?: TimeframeKey;
  onRefresh?: () => void;
}

export default function BistValuationTable({
  items,
  loading = false,
  timeframe = "1d",
  onRefresh,
}: BistValuationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<BistSectorKey>("bist30");
  const [savedDefaultSector, setSavedDefaultSector] = useState<BistSectorKey>("bist30");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<"ALL" | "AL" | "TUT" | "SAT">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("upside");
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(60);
  const [viewMode, setViewMode] = useState<"auto" | "cards" | "table">("auto");

  // Load saved default sector and refresh setting on mount
  useEffect(() => {
    let hasLocal = false;
    try {
      const saved = localStorage.getItem("bist_default_sector");
      if (saved && BIST_SECTOR_FILTERS.some((s) => s.key === saved)) {
        setSectorFilter(saved as BistSectorKey);
        setSavedDefaultSector(saved as BistSectorKey);
        hasLocal = true;
      }
    } catch {
      // ignore
    }

    let active = true;
    (async () => {
      try {
        const [refRes, bistRes] = await Promise.all([
          fetch("/api/settings/refresh?market=bist_valuation", { cache: "no-store" }),
          fetch("/api/settings/bist", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (refRes.ok) {
          const json = await refRes.json();
          const sec = json.config?.markets?.bist_valuation ?? json.effectiveSeconds;
          if (sec !== undefined) {
            setRefreshInterval(sec as RefreshInterval);
          }
        }

        if (bistRes.ok) {
          const bJson = await bistRes.json();
          if (bJson.settings?.defaultSector) {
            const serverSec = bJson.settings.defaultSector as BistSectorKey;
            setSavedDefaultSector(serverSec);
            if (!hasLocal) {
              setSectorFilter(serverSec);
            }
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

  // Periodic auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0 || !onRefresh) return;
    const timer = setInterval(() => {
      onRefresh();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, onRefresh]);

  const handleSelectSector = async (secKey: BistSectorKey) => {
    setSectorFilter(secKey);
    setSavedDefaultSector(secKey);
    try {
      localStorage.setItem("bist_default_sector", secKey);
      setSaveNotice(
        secKey === "all" || secKey === "bistall"
          ? "Varsayılan: BIST TÜM"
          : `Varsayılan: ${getBistSectorLabel(secKey)}`
      );
      setTimeout(() => setSaveNotice(null), 2500);

      // Sunucu bist-settings.md ile senkronize et
      await fetch("/api/settings/bist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector: secKey }),
      });
    } catch {
      // ignore
    }
  };

  // Filtered and Sorted Data
  const filteredData = useMemo(() => {
    let result = [...items];

    // Sector & Index Filter
    if (sectorFilter !== "all" && sectorFilter !== "bistall") {
      if (sectorFilter === "bist30") {
        result = result.filter((d) => isBist30(d.ticker));
      } else if (sectorFilter === "bist100") {
        result = result.filter((d) => isBist100(d.ticker));
      } else {
        result = result.filter((d) => getBistSector(d.ticker, d.code) === sectorFilter);
      }
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
        case "pb": {
          const pbA = a.usStock?.pb ?? Infinity;
          const pbB = b.usStock?.pb ?? Infinity;
          return pbA - pbB;
        }
        case "roe": {
          const roeA = a.usStock?.roe ?? -Infinity;
          const roeB = b.usStock?.roe ?? -Infinity;
          return roeB - roeA;
        }
        case "ticker":
          return a.code.localeCompare(b.code);
        default:
          return 0;
      }
    });

    return result;
  }, [items, sectorFilter, signalFilter, searchQuery, sortBy]);

  return (
    <section
      id="bist-valuation-table-section"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5 shadow-xl backdrop-blur-md"
    >
      {/* Table Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex flex-wrap items-center gap-2">
            <span>Borsa İstanbul Hisseleri &amp; Değerleme Tablosu</span>
            <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-xs text-sky-400 font-semibold">
              {filteredData.length} / {items.length}
            </span>
            <span
              title="Varsayılan Sektör / Sekme: BIST ekranı açıldığında doğrudan seçilecek sektör"
              className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300"
            >
              <span>⚙️</span>
              <span>
                Varsayılan Sektör:{" "}
                {BIST_SECTOR_FILTERS.find((c) => c.key === savedDefaultSector)?.label ?? "Tümü"}
              </span>
            </span>
            {saveNotice && (
              <span className="animate-pulse rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                ✓ {saveNotice}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kurumsal analist konsensüs hedefleri, F/K, PD/DD, ROE kârlılık oranları ve teknik &amp; temel sinyaller.
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
                placeholder="Listede filtrele (THYAO, Garanti...)"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            intervalSeconds={refreshInterval}
            onIntervalChange={(sec) => setRefreshInterval(sec)}
            onRefresh={() => {
              if (onRefresh) onRefresh();
            }}
            isRefreshing={loading}
            market="bist_valuation"
            storageKey="bist_valuation_refresh_interval"
            size="sm"
          />
        </div>
      </div>

      {/* Sector Tabs & Filter Controls */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Sector / Index Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {BIST_SECTOR_FILTERS.map((sec) => {
            const isActive = sectorFilter === sec.key;
            const isDefault = savedDefaultSector === sec.key;
            const count =
              sec.key === "all" || sec.key === "bistall"
                ? items.length
                : sec.key === "bist100"
                ? items.filter((d) => isBist100(d.ticker)).length
                : sec.key === "bist30"
                ? items.filter((d) => isBist30(d.ticker)).length
                : items.filter((d) => getBistSector(d.ticker, d.code) === sec.key).length;

            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => handleSelectSector(sec.key)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition whitespace-nowrap active:scale-95 ${
                  isActive
                    ? "border-sky-500 bg-sky-500/20 text-sky-300 shadow-sm font-semibold"
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
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="upside">🎯 En Yüksek Yükseliş Potansiyeli</option>
              <option value="scoreDesc">⭐ En Yüksek Skor</option>
              <option value="scoreAsc">⚠️ En Düşük Skor</option>
              <option value="changeDesc">📈 En Çok Yükselenler (%)</option>
              <option value="changeAsc">📉 En Çok Düşenler (%)</option>
              <option value="pe">💎 En Düşük F/K (P/E)</option>
              <option value="pb">🏢 En Düşük PD/DD (P/B)</option>
              <option value="roe">🚀 En Yüksek ROE (%)</option>
              <option value="ticker">🔤 Sembol (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle (Mobile / Desktop) */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "cards" ? "auto" : "cards")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                viewMode === "cards"
                  ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm"
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
                  ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Geniş Tablo Görünümü"
            >
              💻 Tablo
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="animate-pulse py-12 text-center text-xs text-zinc-500">
          Borsa İstanbul hisseleri analiz ediliyor...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          Seçilen filtrelere uygun BIST hissesi bulunamadı.
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="ml-2 text-sky-400 underline hover:text-sky-300"
            >
              Aramayı Temizle
            </button>
          )}
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
              const icon = BIST_ICONS[item.code] || "🇹🇷";
              const upside = item.usStock?.upsidePercent;
              const inBist30 = isBist30(item.ticker);
              const inBist100 = isBist100(item.ticker);
              const sectorLabel = getBistSectorLabel(getBistSector(item.ticker, item.code));
              const isUp = item.changePercent >= 0;

              return (
                <div
                  key={item.ticker}
                  className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-3.5 shadow-md backdrop-blur-md transition hover:border-zinc-700"
                >
                  {/* Top Header: Icon, Code, Name, Badges, Signal */}
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl flex-shrink-0" role="img" aria-label={item.code}>
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/symbol/${encodeURIComponent(item.ticker)}?tf=${timeframe}`}
                            className="font-mono text-sm font-bold text-sky-400 hover:text-sky-300 transition"
                          >
                            {item.code}
                          </Link>
                          {inBist30 ? (
                            <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 text-[9px] font-bold text-sky-400">
                              BIST 30
                            </span>
                          ) : inBist100 ? (
                            <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.2 text-[9px] font-bold text-indigo-400">
                              BIST 100
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-zinc-400 truncate max-w-[200px]">{item.name}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <SignalBadge signal={item.signal} size="sm" />
                      <span className="text-[10px] text-zinc-500">{sectorLabel}</span>
                    </div>
                  </div>

                  {/* Middle: Price, Change, Target & Upside */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950/70 p-2.5 border border-zinc-800/60">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-zinc-500">Son Fiyat</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono text-base font-bold text-zinc-100">
                          {formatPrice(item.price, "TRY")}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {formatSigned(item.changePercent, 2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-semibold text-zinc-500">12A Hedef / Getiri</span>
                      <div className="mt-0.5">
                        {item.usStock?.targetMeanPrice ? (
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="font-mono text-xs font-semibold text-zinc-200">
                              ₺{formatNumber(item.usStock.targetMeanPrice, 1)}
                            </span>
                            {upside != null && (
                              <span className={`font-mono text-xs font-bold ${upside > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                ({upside > 0 ? `+${upside}%` : `${upside}%`})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Analyst Recommendation & Valuation Multiples */}
                  <div className="mt-2.5 flex items-center justify-between text-xs border-t border-zinc-800/40 pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500">Analist:</span>
                      {getRecommendationBadge(item.usStock?.recommendationKey, item.usStock?.numberOfAnalystOpinions)}
                    </div>
                    <div className="flex items-center gap-2.5 font-mono text-[11px] text-zinc-400">
                      <span title="Fiyat / Kazanç (P/E)">
                        F/K: <strong className="text-zinc-200">{item.usStock?.pe != null && item.usStock.pe > 0 ? formatNumber(item.usStock.pe, 1) : "—"}</strong>
                      </span>
                      <span title="Piyasa Değeri / Defter Değeri (P/B)">
                        PD/DD: <strong className={item.usStock?.pb != null && item.usStock.pb < 2 ? "text-emerald-400 font-bold" : "text-zinc-200"}>{item.usStock?.pb != null && item.usStock.pb > 0 ? formatNumber(item.usStock.pb, 2) : "—"}</strong>
                      </span>
                      <span title="Özsermaye Kârlılığı (ROE)">
                        ROE: <strong className="text-zinc-200">{item.usStock?.roe != null ? `%${(item.usStock.roe * 100).toFixed(0)}` : "—"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/40">
                    <Link
                      href={`/symbol/${encodeURIComponent(item.ticker)}?tf=${timeframe}`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 text-xs font-bold text-sky-400 hover:text-sky-300 hover:bg-zinc-800 active:scale-95 transition"
                    >
                      <span>Detaylı Grafik & Analiz</span>
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
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Şirket / Sembol</th>
                  <th className="px-3 py-3">Endeks / Sektör</th>
                  <th className="px-3 py-3 text-right">Son Fiyat</th>
                  <th className="px-3 py-3 text-right">Değişim</th>
                  <th className="px-3 py-3 text-center">Sinyal ({timeframe.toUpperCase()})</th>
                  <th className="px-3 py-3 text-center">Analist Görüşü</th>
                  <th className="px-3 py-3 text-right">Hedef Fiyat</th>
                  <th className="px-3 py-3 text-right">Yükseliş (%)</th>
                  <th className="px-3 py-3 text-right">F/K (P/E)</th>
                  <th className="px-3 py-3 text-right">PD/DD</th>
                  <th className="px-3 py-3 text-right">ROE</th>
                  <th className="px-3 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredData.map((item) => {
                  const icon = BIST_ICONS[item.code] || "🇹🇷";
                  const upside = item.usStock?.upsidePercent;
                  const inBist30 = isBist30(item.ticker);
                  const inBist100 = isBist100(item.ticker);
                  const sectorLabel = getBistSectorLabel(getBistSector(item.ticker, item.code));

                  return (
                    <tr key={item.ticker} className="transition hover:bg-zinc-800/40">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg" role="img" aria-label={item.code}>
                            {icon}
                          </span>
                          <div>
                            <div className="font-bold text-zinc-100">{item.name}</div>
                            <div className="font-mono text-[10px] text-zinc-500">
                              {item.code}
                              <span className="text-zinc-600">.IS</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{sectorLabel}</span>
                          {inBist30 ? (
                            <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 text-[9px] font-bold text-sky-400">
                              BIST 30
                            </span>
                          ) : inBist100 ? (
                            <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1 py-0.2 text-[9px] font-bold text-indigo-400">
                              BIST 100
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100">
                        {formatPrice(item.price, "TRY")}
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
                        {getRecommendationBadge(
                          item.usStock?.recommendationKey,
                          item.usStock?.numberOfAnalystOpinions
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-200">
                        {item.usStock?.targetMeanPrice
                          ? `₺${formatNumber(item.usStock.targetMeanPrice, 1)}`
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
                        {item.usStock?.pe != null && item.usStock.pe > 0
                          ? formatNumber(item.usStock.pe, 1)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {item.usStock?.pb != null && item.usStock.pb > 0 ? (
                          <span
                            className={
                              item.usStock.pb < 2.0
                                ? "text-emerald-400 font-bold"
                                : "text-zinc-300"
                            }
                          >
                            {formatNumber(item.usStock.pb, 2)}
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
                          href={`/symbol/${encodeURIComponent(item.ticker)}?tf=${timeframe}`}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:border-sky-500 hover:text-white transition"
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
  );
}

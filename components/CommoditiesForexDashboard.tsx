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

const COMMODITY_CHIPS = [
  { code: "GC=F", label: "🥇 Ons Altın" },
  { code: "SI=F", label: "🥈 Gümüş" },
  { code: "USDTRY=X", label: "💵 Dolar/TL" },
  { code: "EURTRY=X", label: "💶 Euro/TL" },
  { code: "BZ=F", label: "🛢️ Brent Petrol" },
  { code: "CL=F", label: "⛽ Ham Petrol" },
  { code: "DX-Y.NYB", label: "🌐 DXY Endeks" },
  { code: "HG=F", label: "🥉 Bakır" },
];

interface MarketItemData {
  ticker: string;
  name: string;
  icon?: string;
  category: string;
  currency: string;
  unit?: string;
  price: number;
  change: number;
  changePercent: number;
  signal: "AL" | "SAT" | "TUT";
  score: number;
  techScore: number;
  fundScore: number | null;
  timeframe: string;
  pivots?: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
  dxy?: number | null;
  goldSilverRatio?: number | null;
  gramGoldTRY?: number | null;
  indicators: {
    rsi: number | null;
    sma50: number | null;
    sma200: number | null;
    bbUpper: number | null;
    bbLower: number | null;
  };
  reasons: string[];
}

export default function CommoditiesForexDashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1d");
  const [data, setData] = useState<MarketItemData[]>([]);
  const [usdTry, setUsdTry] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string>("GC=F");
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(60);

  const loadData = async (tf: TimeframeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-summary?market=commodity_forex&timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
        if (json.usdTry) setUsdTry(json.usdTry);
      }
    } catch (e) {
      console.error("[CommoditiesForexDashboard] Veri çekilemedi:", e);
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

  const goldItem = data.find((d) => d.ticker === "GC=F");
  const silverItem = data.find((d) => d.ticker === "SI=F");
  const dxyItem = data.find((d) => d.ticker === "DX-Y.NYB");
  const usdItem = data.find((d) => d.ticker === "USDTRY=X");
  const eurItem = data.find((d) => d.ticker === "EURTRY=X");
  const brentItem = data.find((d) => d.ticker === "BZ=F");

  const selectedItem = data.find((d) => d.ticker === selectedTicker) || data[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-amber-900/40 bg-gradient-to-b from-amber-950/40 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Emtia, Kıymetli Madenler & Döviz Piyasası
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Altın, Döviz & Küresel Emtia Karar Destek
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base leading-relaxed">
            Ons & Gram Altın, Gümüş, Dolar/TL, Euro/TL ve Petrol için <strong>Pivot Seviyeleri (Destek/Direnç)</strong>, DXY korelasyonu ve çoklu periyot AL/SAT sinyalleri.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <TimeframeSelector
              value={timeframe}
              onChange={setTimeframe}
              size="sm"
              label="Varsayılan Analiz Periyodu"
              description="Emtia ve döviz analiz ve grafik varsayılan periyodu"
            />
            <div className="h-8 w-px bg-zinc-800 hidden sm:block self-center" />
            <MailScheduleControl size="sm" market="commodity_forex" />
            <MailRecipientsControl size="sm" context="positions" />
            <AutoRefreshControl
              intervalSeconds={refreshInterval}
              onIntervalChange={(sec) => setRefreshInterval(sec)}
              onRefresh={() => void loadData(timeframe)}
              isRefreshing={loading}
              market="commodity_forex"
              storageKey="commodity_refresh_interval"
              size="sm"
            />
          </div>

          {/* Searchable Combobox for Commodities & Forex */}
          <div className="mt-4 w-full">
            <BistCombobox
              market="commodity_forex"
              placeholder="Altın, gümüş, döviz veya petrol ara (GC=F, Ons, Dolar, Brent...)"
              autoNavigate={false}
              onSelect={(company) => setSelectedCompany(company)}
            />
          </div>

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Hızlı erişim:</span>
            {COMMODITY_CHIPS.map((chip) => {
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
                      city: "🥇 Emtia/FX",
                    });
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                    isActive
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
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

      {/* Quick Macro Barometer (Gram Altın, Ons, Dolar, Euro, DXY, Rasyo) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Gram Altın (Özel Hesaplanan) */}
        <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>🪙 Gram Altın (TL)</span>
            <span className="text-[10px] font-mono">Tahmini</span>
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-white">
            {goldItem?.gramGoldTRY != null ? `${formatNumber(goldItem.gramGoldTRY, 2)} ₺` : "—"}
          </div>
          <div className="text-[10px] text-amber-300/80">
            {goldItem?.price && usdItem?.price
              ? `Ons $${formatNumber(goldItem.price, 0)} × USD ${formatNumber(usdItem.price, 2)}`
              : "Canlı Ons & Kur hesabı"}
          </div>
        </div>

        {/* Ons Altın */}
        <Link
          href="/symbol/GC=F"
          className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 transition hover:border-amber-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>🥇 Ons Altın</span>
            {goldItem && <SignalBadge signal={goldItem.signal} size="sm" />}
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-zinc-100">
            {goldItem ? formatPrice(goldItem.price, "USD") : "—"}
          </div>
          <div className={`text-xs font-semibold ${goldItem && goldItem.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {goldItem ? `${formatSigned(goldItem.changePercent, 2)}%` : "—"}
          </div>
        </Link>

        {/* Dolar / TL */}
        <Link
          href="/symbol/USDTRY=X"
          className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 transition hover:border-sky-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>💵 USD / TRY</span>
            {usdItem && <SignalBadge signal={usdItem.signal} size="sm" />}
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-zinc-100">
            {usdItem ? `${formatNumber(usdItem.price, 4)} ₺` : "—"}
          </div>
          <div className={`text-xs font-semibold ${usdItem && usdItem.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {usdItem ? `${formatSigned(usdItem.changePercent, 2)}%` : "—"}
          </div>
        </Link>

        {/* Euro / TL */}
        <Link
          href="/symbol/EURTRY=X"
          className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 transition hover:border-indigo-500/50 hover:bg-zinc-900"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>💶 EUR / TRY</span>
            {eurItem && <SignalBadge signal={eurItem.signal} size="sm" />}
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-zinc-100">
            {eurItem ? `${formatNumber(eurItem.price, 4)} ₺` : "—"}
          </div>
          <div className={`text-xs font-semibold ${eurItem && eurItem.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {eurItem ? `${formatSigned(eurItem.changePercent, 2)}%` : "—"}
          </div>
        </Link>

        {/* Dolar Endeksi (DXY) */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>🌐 DXY (Dolar End.)</span>
            <span className="text-[10px] text-zinc-500">Korelasyon</span>
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-zinc-100">
            {dxyItem ? formatNumber(dxyItem.price, 2) : "—"}
          </div>
          <div className="text-[10px] text-zinc-500">
            {dxyItem && dxyItem.changePercent < 0 ? "Altın için Destekleyici" : "Altında Baskı"}
          </div>
        </div>

        {/* Altın / Gümüş Rasyosu */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>⚖️ Altın/Gümüş Rasyosu</span>
            <span className="text-[10px] text-zinc-500">Altın/Gümüş</span>
          </div>
          <div className="my-1.5 text-lg sm:text-xl font-extrabold text-zinc-100">
            {goldItem?.goldSilverRatio ? formatNumber(goldItem.goldSilverRatio, 1) : "—"}
          </div>
          <div className="text-[10px] text-zinc-500">
            {goldItem?.goldSilverRatio && goldItem.goldSilverRatio > 85 ? "Gümüş tarihsel ucuz" : "Dengeli bant"}
          </div>
        </div>
      </section>

      {/* Selected Asset Deep Dive: Pivot Level Matrix (Forex/Commodity's #1 Tool) */}
      {selectedItem?.pivots && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedItem.icon}</span>
                <h2 className="text-lg font-bold text-zinc-100">
                  {selectedItem.name} — Pivot Destek & Direnç Seviyeleri
                </h2>
                <SignalBadge signal={selectedItem.signal} size="sm" />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Gün içi ve kısa vadeli işlemler için algoritmik destek ve direnç hedefleri.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Şu Anki Fiyat:</span>
              <span className="font-mono text-base font-extrabold text-zinc-100">
                {formatPrice(selectedItem.price, selectedItem.currency)}
              </span>
              <Link
                href={`/symbol/${encodeURIComponent(selectedItem.ticker)}`}
                className="rounded-lg bg-sky-600/20 border border-sky-500/40 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-600/30 transition"
              >
                Grafik & Detay →
              </Link>
            </div>
          </div>

          {/* Pivot Table */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* S3 */}
            <div className="rounded-xl border border-red-950 bg-red-950/20 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Destek 3 (S3)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-300">{selectedItem.pivots.s3}</p>
              <span className="text-[9px] text-zinc-500">Aşırı Dip Bölgesi</span>
            </div>
            {/* S2 */}
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Destek 2 (S2)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-200">{selectedItem.pivots.s2}</p>
              <span className="text-[9px] text-zinc-500">Güçlü Tepki Destek</span>
            </div>
            {/* S1 */}
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Destek 1 (S1)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-100">{selectedItem.pivots.s1}</p>
              <span className="text-[9px] text-zinc-500">İlk Ara Destek</span>
            </div>
            {/* PIVOT POINT (MERKEZ) */}
            <div className="rounded-xl border-2 border-sky-500/60 bg-sky-950/40 p-3 text-center shadow-lg shadow-sky-500/10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">MERKEZ PIVOT (P)</span>
              <p className="mt-1 font-mono text-base font-black text-white">{selectedItem.pivots.pivot}</p>
              <span className={`text-[9px] font-bold ${selectedItem.price >= selectedItem.pivots.pivot ? "text-emerald-400" : "text-red-400"}`}>
                {selectedItem.price >= selectedItem.pivots.pivot ? "▲ Pivot Üzerinde (Boğa)" : "▼ Pivot Altında (Ayı)"}
              </span>
            </div>
            {/* R1 */}
            <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Direnç 1 (R1)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-100">{selectedItem.pivots.r1}</p>
              <span className="text-[9px] text-zinc-500">İlk Hedef Direnç</span>
            </div>
            {/* R2 */}
            <div className="rounded-xl border border-emerald-900/80 bg-emerald-950/40 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Direnç 2 (R2)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-100">{selectedItem.pivots.r2}</p>
              <span className="text-[9px] text-zinc-500">Kritik Kırılım Seviyesi</span>
            </div>
            {/* R3 */}
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Direnç 3 (R3)</span>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-100">{selectedItem.pivots.r3}</p>
              <span className="text-[9px] text-zinc-500">Aşırı Alım Zirve</span>
            </div>
          </div>
        </section>
      )}

      {/* Main Asset Signals Table */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Tüm Emtia & Döviz Varlıkları ({data.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              İstediğiniz varlığa tıklayarak yukarıdaki Pivot Destek/Direnç panelini güncelleyebilir veya detay grafiğine gidebilirsiniz.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse py-12 text-center text-xs text-zinc-500">
            Emtia ve döviz verileri taranıyor...
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto touch-scroll scrollbar-none">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-medium text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Varlık / Parite</th>
                  <th className="px-3 py-3 text-right">Son Fiyat</th>
                  <th className="px-3 py-3 text-right">Değişim</th>
                  <th className="px-3 py-3 text-center">Sinyal ({timeframe.toUpperCase()})</th>
                  <th className="px-3 py-3 text-right">RSI (14)</th>
                  <th className="px-3 py-3 text-center">Pivot Rejimi</th>
                  <th className="px-3 py-3">Öne Çıkan Gerekçe</th>
                  <th className="px-3 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {data.map((item) => {
                  const isSelected = item.ticker === selectedTicker;
                  const isPivotBull = item.pivots ? item.price >= item.pivots.pivot : null;

                  return (
                    <tr
                      key={item.ticker}
                      onClick={() => setSelectedTicker(item.ticker)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-amber-500/10 border-l-2 border-amber-500"
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <div>
                            <div className="font-bold text-zinc-100">{item.name}</div>
                            <div className="font-mono text-[10px] text-zinc-500">{item.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-zinc-100">
                        {formatPrice(item.price, item.currency)}
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
                      <td className="px-3 py-3 text-center">
                        {isPivotBull != null ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isPivotBull
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {isPivotBull ? "▲ Pivot Üstü" : "▼ Pivot Altı"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-400 max-w-xs truncate">
                        {item.reasons[0] || "Dengeli piyasa koşulları"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/symbol/${encodeURIComponent(item.ticker)}`}
                          onClick={(e) => e.stopPropagation()}
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
          defaultMarket="commodity_forex"
          title="Emtia & Döviz Pozisyon Takibi (Stop-Loss & Kâr Al)"
          subtitle="Aldığınız altın, gümüş, döviz veya petrol pozisyonları için canlı kâr/zarar ve otomatik e-posta alarmları"
        />
      </section>

      {/* Multi-Timeframe Categorized Signals (5m, 15m, 1h, 4h, Günlük, Haftalık) */}
      <section id="signals-section" className="w-full scroll-mt-20">
        <TimeframeSignals
          market="commodity_forex"
          title="Emtia & Döviz Çoklu Zaman Dilimi AL/SAT Sinyalleri"
          subtitle="Altın, gümüş, döviz kurları ve petrol için tüm zaman dilimlerinde hesaplanan AL/SAT sinyalleri."
        />
      </section>

      {/* Top Signals Ranking for Commodities & Forex */}
      <section id="top-signals-section" className="w-full scroll-mt-20">
        <TopSignals
          market="commodity_forex"
          title="Emtia & Döviz Lider Sinyaller"
          subtitle="Emtia, altın ve döviz pariteleri arasında karar destek skoruna göre en güçlü AL ve SAT sinyalleri."
        />
      </section>

      {/* TrackList Table (Sinyal Karşılaştırma) */}
      <section id="tracklist-section" className="w-full scroll-mt-20">
        <TrackListTable
          defaultCategory="commodity_forex"
          title="Emtia & Döviz Sinyal Performansı (Takip Listem)"
          subtitle="Takibe aldığınız altın, gümüş veya döviz sinyallerinin zaman içindeki başarı ve getiri performansı."
        />
      </section>

      {/* Main Watchlist Table */}
      <section id="watchlist-section" className="w-full scroll-mt-20">
        <WatchlistTable
          defaultCategory="commodity_forex"
          title="Emtia & Döviz İzleme Listesi"
          subtitle="Takipteki altın, gümüş ve döviz kurlarında AL/SAT sinyali değiştiğinde anında e-posta tetiklenir."
        />
      </section>
    </div>
  );
}

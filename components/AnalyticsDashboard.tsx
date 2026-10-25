"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type {
  AnalyticsEvent,
  AnalyticsSummary,
  AnalyticsTimeframe,
  GeoStat,
  IpStat,
  ScreenStat,
} from "@/lib/analytics-types";

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "Az önce";
  if (diffSec < 60) return `${diffSec} sn önce`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

function formatExactTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCountryFlag(countryCode?: string): string {
  if (!countryCode) return "🇹🇷";
  const code = countryCode.toUpperCase();
  if (code === "TR") return "🇹🇷";
  if (code === "US") return "🇺🇸";
  if (code === "DE") return "🇩🇪";
  if (code === "GB") return "🇬🇧";
  if (code === "FR") return "🇫🇷";
  if (code === "NL") return "🇳🇱";
  if (code === "AZ") return "🇦🇿";
  if (code === "CY") return "🇨🇾";
  return "🌐";
}

const TIMEFRAME_OPTIONS: { id: AnalyticsTimeframe; label: string; icon: string; desc: string }[] = [
  { id: "realtime", label: "Anlık", icon: "🟢", desc: "Son 15 Dakika" },
  { id: "hourly", label: "Saatlik", icon: "⏱️", desc: "Son 24 Saat" },
  { id: "weekly", label: "Haftalık", icon: "📅", desc: "Son 7 Gün" },
  { id: "monthly", label: "Aylık", icon: "🗓️", desc: "Son 30 Gün" },
  { id: "all", label: "Tümü", icon: "🌐", desc: "Tüm Kayıtlar" },
];

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("hourly");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [clientIp, setClientIp] = useState<string>("");
  const [clientGeo, setClientGeo] = useState<{ city: string; country: string; countryCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"screens" | "ips" | "locations" | "live">("ips");
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async (selectedTf = timeframe) => {
    try {
      const res = await fetch(`/api/analytics/stats?timeframe=${selectedTf}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Veri çekilemedi");
      const data = await res.json();
      if (data.ok && data.summary) {
        setSummary(data.summary);
        if (data.clientIp) setClientIp(data.clientIp);
        if (data.clientGeo) setClientGeo(data.clientGeo);
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Initial load
  useEffect(() => {
    fetchStats(timeframe);
  }, [fetchStats, timeframe]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      fetchStats(timeframe);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchStats, timeframe]);

  // Trigger test click
  const handleTriggerTestClick = async () => {
    try {
      setActionMessage("Test tıklaması gönderiliyor...");
      const res = await fetch("/api/analytics/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_event" }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage(`✓ Test tıklaması kaydedildi (${data.event.screen} · ${data.event.city || "İstanbul"})`);
        fetchStats(timeframe);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch {
      setActionMessage("Hata oluştu");
    }
  };

  // Reseed demo data
  const handleSeedDemoData = async () => {
    if (!confirm("Örnek demo verileri yüklensin mi?")) return;
    try {
      setActionMessage("Örnek veriler yükleniyor...");
      const res = await fetch("/api/analytics/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage("✓ Demo verileri başarıyla yüklendi");
        fetchStats(timeframe);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch {
      setActionMessage("Hata oluştu");
    }
  };

  // Clear analytics
  const handleClearData = async () => {
    if (!confirm("Tüm ziyaretçi ve tıklama analiz verilerini silmek istediğinizden emin misiniz?")) return;
    try {
      setActionMessage("Veriler temizleniyor...");
      const res = await fetch("/api/analytics/stats", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setActionMessage("✓ Tüm veriler temizlendi");
        fetchStats(timeframe);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch {
      setActionMessage("Hata oluştu");
    }
  };

  // Filtered lists
  const query = searchQuery.trim().toLowerCase();

  const filteredScreens: ScreenStat[] = (summary?.screenStats || []).filter(
    (s) => !query || s.screen.toLowerCase().includes(query) || s.path.toLowerCase().includes(query)
  );

  const filteredIps: IpStat[] = (summary?.ipStats || []).filter(
    (i) =>
      !query ||
      i.ip.toLowerCase().includes(query) ||
      i.city.toLowerCase().includes(query) ||
      i.country.toLowerCase().includes(query) ||
      i.topScreen.toLowerCase().includes(query) ||
      Object.keys(i.screens).some((s) => s.toLowerCase().includes(query))
  );

  const filteredLocations: GeoStat[] = (summary?.geoStats || []).filter(
    (g) => !query || g.city.toLowerCase().includes(query) || g.country.toLowerCase().includes(query)
  );

  const filteredEvents: AnalyticsEvent[] = (summary?.recentEvents || []).filter(
    (e) =>
      !query ||
      e.ip.toLowerCase().includes(query) ||
      (e.city && e.city.toLowerCase().includes(query)) ||
      (e.country && e.country.toLowerCase().includes(query)) ||
      e.screen.toLowerCase().includes(query) ||
      (e.label && e.label.toLowerCase().includes(query))
  );

  const maxTimelineCount = Math.max(1, ...(summary?.timeline.map((t) => t.count) || [1]));

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. Header Bar: Title, Status, Auto-refresh & Action Controls  */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Ziyaretçi & Ekran Tıklama Analitiği
              </h1>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
                CANLI MONİTÖR & COĞRAFİ KONUM
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
              Kullanıcı IP adresleri, <strong>şehir & ülke konumları</strong>, ekran tıklama sayıları ve anlık trafik izleme terminali.
            </p>
          </div>

          {/* Controls: Auto-refresh selector, Manual refresh & Simulation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto refresh select */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 text-xs text-zinc-300">
              <span className="text-[11px] text-zinc-400 font-medium">Yenileme:</span>
              <select
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-sky-400 outline-none cursor-pointer"
              >
                <option value={0} className="bg-zinc-900 text-zinc-200">Kapalı</option>
                <option value={3} className="bg-zinc-900 text-zinc-200">3 sn</option>
                <option value={5} className="bg-zinc-900 text-zinc-200">5 sn</option>
                <option value={10} className="bg-zinc-900 text-zinc-200">10 sn</option>
                <option value={30} className="bg-zinc-900 text-zinc-200">30 sn</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchStats(timeframe)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm transition hover:border-zinc-600 hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
              title="Verileri şimdi yenile"
            >
              <svg
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-400" : "text-zinc-300"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Yenile</span>
            </button>

            {/* Simulate Click Button */}
            <button
              onClick={handleTriggerTestClick}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95"
              title="Canlı bir test tıklaması kaydet"
            >
              <span>⚡ Test Tıklaması Yap</span>
            </button>

            {/* More Menu Dropdown / Tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleSeedDemoData}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                title="Örnek verileri yükle"
              >
                Örnek Veri
              </button>
              <button
                onClick={handleClearData}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] font-medium text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                title="Tüm kayıtları sıfırla"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Action message banner */}
        {actionMessage && (
          <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300 animate-fadeIn">
            {actionMessage}
          </div>
        )}

        {/* ============================================================== */}
        {/* Timeframe Selector Pills (Aylık, Haftalık, Saatlik, Anlık)     */}
        {/* ============================================================== */}
        <div className="mt-5 border-t border-zinc-800/80 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {TIMEFRAME_OPTIONS.map((opt) => {
                const isActive = timeframe === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTimeframe(opt.id);
                      startTransition(() => {
                        fetchStats(opt.id);
                      });
                    }}
                    className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "border border-sky-500/50 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-sky-500/20 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500/30"
                        : "border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm">{opt.icon}</span>
                    <div className="flex flex-col text-left">
                      <span className="leading-tight">{opt.label}</span>
                      <span className={`text-[9px] font-normal ${isActive ? "text-sky-300" : "text-zinc-500"}`}>
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Period Indicator */}
            <div className="text-right">
              <span className="text-[11px] text-zinc-500">Seçili Zaman Aralığı:</span>
              <p className="text-xs font-mono font-semibold text-sky-400">
                {summary?.periodLabel || "Yükleniyor..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. Top Summary Stat Cards (Includes City & Country Top KPI)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Card 1: Realtime Active Users (Last 15m) */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">🔴 Anlık Aktif IP</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {summary ? summary.realtimeActiveIps : "..."}
            </span>
            <span className="text-xs text-zinc-400 font-medium">tekil kullanıcı</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Son 15 dakika içinde aktif tekil IP
          </p>
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
        </div>

        {/* Card 2: Total Clicks */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-zinc-900/80 to-zinc-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-400">📊 Toplam Tıklama</span>
            <span className="text-base">🖱️</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {summary ? summary.totalClicks.toLocaleString("tr-TR") : "..."}
            </span>
            <span className="text-xs text-zinc-400 font-medium">etkileşim</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            {summary?.periodLabel} tıklama adedi
          </p>
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-500/10 blur-xl pointer-events-none" />
        </div>

        {/* Card 3: Unique IPs */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-zinc-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400">👥 Tekil IP Sayısı</span>
            <span className="text-base">🌐</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {summary ? summary.uniqueIps : "..."}
            </span>
            <span className="text-xs text-zinc-400 font-medium">farklı IP</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Farklı internet adresi sayısı
          </p>
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Top Location (City & Country) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-zinc-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">📍 Lider Şehir & Ülke</span>
            <span className="text-base">🏙️</span>
          </div>
          <div className="mt-2 truncate">
            <span className="text-base sm:text-lg font-bold text-white truncate block">
              {summary?.topLocation ? (
                <>
                  <span className="mr-1">{getCountryFlag()}</span>
                  <span>{summary.topLocation.city}, {summary.topLocation.country}</span>
                </>
              ) : (
                "-"
              )}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            {summary?.topLocation ? `${summary.topLocation.clicks} tıklama kaydedildi` : "Henüz konum yok"}
          </p>
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
        </div>

        {/* Card 5: Most visited screen */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-zinc-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-400">🏆 En Çok Tıklanan Ekran</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="mt-2 truncate">
            <span className="text-base sm:text-lg font-bold text-white truncate block" title={summary?.mostVisitedScreen?.screen || "-"}>
              {summary?.mostVisitedScreen?.screen || "-"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            {summary?.mostVisitedScreen ? `${summary.mostVisitedScreen.clicks} tıklama kaydedildi` : "Henüz veri yok"}
          </p>
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-violet-500/10 blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. Client IP & Location Info Banner                            */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-zinc-400">Tespit Edilen IP Adresiniz:</span>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono font-semibold text-sky-300">
            {clientIp || "Tespit ediliyor..."}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-zinc-300">
            <span>📍 {clientGeo?.city || "İstanbul"}, {clientGeo?.country || "Türkiye"}</span>
            <span>{getCountryFlag(clientGeo?.countryCode)}</span>
          </span>
          {clientIp === "127.0.0.1" && (
            <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 text-[10px] text-sky-400">
              Yerel Geliştirici (Localhost)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span>Sunucu Saati:</span>
          <span className="font-mono text-zinc-400">
            {summary ? new Date(summary.serverTime).toLocaleTimeString("tr-TR") : "--:--:--"}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. Timeline Activity Chart (Distribution Bar Visualizer)       */}
      {/* ============================================================== */}
      {summary && summary.timeline.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-200">
                📈 Zaman İçinde Tıklama Dağılımı ({summary.periodLabel})
              </h2>
              <p className="text-[11px] text-zinc-400">
                Seçilen zaman diliminde saatlik/günlük/dakikalık tıklama yoğunlukları
              </p>
            </div>
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-400">
              Maks: {maxTimelineCount} tıklama
            </span>
          </div>

          {/* Histogram Bars */}
          <div className="flex h-36 items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-zinc-800/80 overflow-x-auto touch-scroll scrollbar-none">
            {summary.timeline.map((bucket, idx) => {
              const heightPercent = Math.max(8, Math.round((bucket.count / maxTimelineCount) * 100));
              return (
                <div
                  key={idx}
                  className="group relative flex-1 flex flex-col items-center h-full justify-end"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-12 z-20 hidden flex-col items-center rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] text-white shadow-xl group-hover:flex whitespace-nowrap pointer-events-none">
                    <span className="font-semibold text-sky-300">{bucket.label}</span>
                    <span>{bucket.count} tıklama · {bucket.uniqueIps} IP</span>
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                      bucket.count > 0
                        ? "bg-gradient-to-t from-sky-600 via-indigo-500 to-sky-400 shadow-sm shadow-sky-500/20"
                        : "bg-zinc-800/40"
                    }`}
                  />
                  {/* Label */}
                  <span className="mt-2 text-[9px] sm:text-[10px] font-mono text-zinc-500 truncate w-full text-center">
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. Navigation Tabs & Search Filter                             */}
      {/* ============================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
          <button
            onClick={() => setActiveTab("ips")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "ips"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>🌐 Kullanıcı IP'leri & Konum</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {filteredIps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("screens")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "screens"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>🖥️ Ekranlar & Tıklamalar</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {filteredScreens.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "locations"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>📍 Şehir & Ülke Dağılımı</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {filteredLocations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "live"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🔴 Canlı Akış</span>
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {filteredEvents.length}
            </span>
          </button>
        </div>

        {/* Search input (Searches by IP, City, Country, or Screen) */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="IP, Şehir (İstanbul, Ankara...), Ekran Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 pl-8 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-sky-500 transition"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. Main Content Area according to activeTab                    */}
      {/* ============================================================== */}

      {/* TAB 1: IP ADDRESSES, CITIES & USER DETAILS */}
      {activeTab === "ips" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
          <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-bold text-zinc-200">
              Kullanıcı IP Adresleri, Şehir, Ülke ve Tıklama Detayları
            </h3>
            <p className="text-[11px] text-zinc-400">
              Uygulamayı kullanan her bir IP adresi, <strong>bağlandığı şehir & ülke</strong> ve en çok tıkladığı ekranlar
            </p>
          </div>

          {filteredIps.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Bu filtreye uygun IP veya şehir bilgisi bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredIps.map((ip) => {
                const isCurrent = ip.ip === clientIp;
                return (
                  <div
                    key={ip.ip}
                    className={`p-4 sm:px-6 transition hover:bg-zinc-800/30 ${
                      isCurrent ? "bg-sky-950/20 border-l-2 border-sky-400" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: IP, City & Country Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm sm:text-base font-extrabold text-white">
                            {ip.ip}
                          </span>

                          {/* City & Country Badge with Flag */}
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                            <span>{getCountryFlag(ip.countryCode)}</span>
                            <span>{ip.city}, {ip.country}</span>
                          </span>

                          {isCurrent && (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              SİZİN IP'NİZ
                            </span>
                          )}

                          {ip.isLocal && (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              Yerel Ağ
                            </span>
                          )}

                          <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">
                            {ip.device === "Mobil" ? "📱 Mobil" : ip.device === "Tablet" ? "📱 Tablet" : "💻 Masaüstü"}
                          </span>
                        </div>

                        {/* Top screen visited */}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                          <span>En çok gezilen:</span>
                          <span className="font-semibold text-sky-300 truncate">
                            {ip.topScreen}
                          </span>
                        </div>

                        {/* Screen visit breakdown pills */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {Object.entries(ip.screens).map(([sName, count]) => (
                            <span
                              key={sName}
                              className="inline-flex items-center gap-1 rounded-md bg-zinc-950/80 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                            >
                              <span className="truncate max-w-[140px]">{sName}:</span>
                              <span className="font-bold text-sky-400 font-mono">{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                        <div>
                          <div className="text-lg font-extrabold text-white font-mono">
                            {ip.totalClicks}
                          </div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            Toplam Tıklama
                          </div>
                        </div>

                        <div className="border-l border-zinc-800 pl-4 sm:pl-6 text-right">
                          <div className="text-xs font-semibold text-zinc-200">
                            {formatRelativeTime(ip.lastSeen)}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500" title={formatExactTime(ip.lastSeen)}>
                            {formatExactTime(ip.lastSeen).split(" ")[1]}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCREENS & CLICKS */}
      {activeTab === "screens" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
          <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-bold text-zinc-200">
              Ekran Başına Tıklama ve Görüntüleme Dağılımı
            </h3>
            <p className="text-[11px] text-zinc-400">
              Uygulamada hangi ekranın kaç kere tıklandığı, ziyaret edildiği ve payı
            </p>
          </div>

          {filteredScreens.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Bu kriterlere uygun ekran tıklaması bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredScreens.map((sc, idx) => (
                <div
                  key={sc.screen}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 transition hover:bg-zinc-800/30"
                >
                  {/* Left: Screen info & link */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">
                        {idx + 1}
                      </span>
                      <Link
                        href={sc.path}
                        className="text-sm font-bold text-zinc-100 hover:text-sky-300 transition truncate"
                      >
                        {sc.screen}
                      </Link>
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {sc.path}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-800">
                        <div
                          style={{ width: `${sc.percentage}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all duration-500"
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-sky-400">
                        %{sc.percentage}
                      </span>
                    </div>
                  </div>

                  {/* Right: Metrics */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div className="text-base font-extrabold text-white">
                        {sc.clicks.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Tıklama
                      </div>
                    </div>

                    <div className="border-l border-zinc-800 pl-4">
                      <div className="text-sm font-bold text-indigo-300">
                        {sc.uniqueIps}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Tekil IP
                      </div>
                    </div>

                    <div className="border-l border-zinc-800 pl-4 text-right hidden sm:block">
                      <div className="text-xs text-zinc-300">
                        {formatRelativeTime(sc.lastClickTime)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Son Etkinlik
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CITY & COUNTRY DISTRIBUTION */}
      {activeTab === "locations" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
          <div className="border-b border-zinc-800/80 px-4 py-3 sm:px-6">
            <h3 className="text-sm font-bold text-zinc-200">
              📍 Şehir & Ülke Bazında Kullanıcı Trafiği
            </h3>
            <p className="text-[11px] text-zinc-400">
              Kullanıcıların hangi şehirlerden ve ülkelerden bağlandığı ve tıklama yoğunluğu
            </p>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Bu aralıkta coğrafi konum verisi bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredLocations.map((loc, idx) => (
                <div
                  key={`${loc.city}-${loc.country}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 transition hover:bg-zinc-800/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                        {idx + 1}
                      </span>
                      <span className="text-xl">{getCountryFlag(loc.countryCode)}</span>
                      <div>
                        <span className="text-sm font-extrabold text-white">
                          {loc.city}
                        </span>
                        <span className="ml-2 text-xs text-zinc-400">
                          ({loc.country})
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-800">
                        <div
                          style={{ width: `${loc.percentage}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500"
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-amber-400">
                        %{loc.percentage}
                      </span>
                    </div>
                  </div>

                  {/* Right metrics */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div className="text-base font-extrabold text-white font-mono">
                        {loc.clicks.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Tıklama
                      </div>
                    </div>

                    <div className="border-l border-zinc-800 pl-4">
                      <div className="text-sm font-bold text-amber-300 font-mono">
                        {loc.uniqueIps}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Tekil IP
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LIVE STREAM (REALTIME EVENT LOG WITH CITY/COUNTRY) */}
      {activeTab === "live" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-bold text-zinc-200">
                  Gerçek Zamanlı Tıklama, IP ve Konum Akışı
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Kullanıcıların yaptığı her tıklama, bağlandığı IP, şehir ve ülke ile anında buraya akar
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              CANLI YAYIN
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Bu aralıkta canlı etkinlik kaydı bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto font-mono text-xs">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] text-zinc-500 shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString("tr-TR")}
                    </span>

                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold shrink-0 ${
                        evt.action === "click"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {evt.action === "click" ? "TIKLAMA" : "GÖRÜNTÜLEME"}
                    </span>

                    <span className="font-bold text-zinc-200 truncate">
                      {evt.screen}
                    </span>

                    <span className="text-zinc-500 truncate hidden lg:inline">
                      ({evt.path})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Location Badge */}
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-amber-300">
                      <span>{getCountryFlag(evt.countryCode)}</span>
                      <span>{evt.city || "İstanbul"}, {evt.country || "Türkiye"}</span>
                    </span>

                    <span className="text-zinc-400 font-semibold font-mono">
                      {evt.ip}
                    </span>

                    <span className="text-[10px] text-zinc-500 hidden sm:inline">
                      {formatRelativeTime(evt.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import WatchlistCombobox from "./WatchlistCombobox";
import AutoRefreshControl, { type RefreshInterval } from "./AutoRefreshControl";
import TimeframeSelector from "./TimeframeSelector";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { AnalysisResult, AssetType } from "@/lib/types";
import { DEFAULT_WATCHLIST, type WatchEntry } from "@/lib/watchlist";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";

type Row =
  | { status: "loading"; data?: AnalysisResult; error?: string }
  | { status: "ok"; data: AnalysisResult; error?: string }
  | { status: "error"; data?: AnalysisResult; error: string };

const QUICK_SUGGESTIONS = [
  { ticker: "GARAN.IS", name: "Garanti Bankası", type: "stock" as const },
  { ticker: "EREGL.IS", name: "Ereğli Demir Çelik", type: "stock" as const },
  { ticker: "TUPRS.IS", name: "Tüpraş", type: "stock" as const },
  { ticker: "BIMAS.IS", name: "BİM Mağazalar", type: "stock" as const },
  { ticker: "GC=F", name: "Ons Altın Vadeli", type: "gold" as const },
];

// Helper to fetch analysis for a single ticker with timeframe
async function fetchSingleSymbolAnalysis(
  ticker: string,
  type: AssetType,
  tf: TimeframeKey = "1d"
): Promise<Row> {
  try {
    const res = await fetch(
      `/api/analyze?ticker=${encodeURIComponent(ticker)}&type=${type}&timeframe=${tf}`,
      { cache: "no-store" }
    );
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    return { status: "ok", data: body as AnalysisResult };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Veri alınamadı",
    };
  }
}

// Helper to fetch analysis for a list of entries with timeframe
async function fetchAnalysisForEntries(
  list: WatchEntry[],
  tf: TimeframeKey = "1d"
): Promise<Record<string, Row>> {
  const results = await Promise.all(
    list.map(async (w): Promise<[string, Row]> => {
      const row = await fetchSingleSymbolAnalysis(w.ticker, w.type, tf);
      return [w.ticker, row];
    })
  );
  return Object.fromEntries(results);
}

export default function WatchlistTable() {
  const [entries, setEntries] = useState<WatchEntry[]>([...DEFAULT_WATCHLIST]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [timeframe, setTimeframe] = useState<TimeframeKey>("1d");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [removingTicker, setRemovingTicker] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30);

  // Load saved interval preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("watchlist_refresh_interval");
      if (saved != null) {
        const parsed = Number(saved) as RefreshInterval;
        if ([0, 15, 30, 60, 120, 300].includes(parsed)) {
          setRefreshInterval(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial mount load: load timeframe settings and watchlist
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        let activeTf: TimeframeKey = "1d";
        try {
          const tfRes = await fetch("/api/timeframe/settings", { cache: "no-store" });
          if (tfRes.ok) {
            const tfJson = await tfRes.json();
            if (tfJson.settings?.watchlist) {
              activeTf = tfJson.settings.watchlist as TimeframeKey;
              if (active) setTimeframe(activeTf);
            }
          }
        } catch {
          // ignore
        }

        const res = await fetch("/api/watchlist", { cache: "no-store" });
        if (!active) return;
        let currentEntries: WatchEntry[] = [...DEFAULT_WATCHLIST];
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.watchlist)) {
            currentEntries = json.watchlist;
          }
        }
        if (!active) return;
        setEntries(currentEntries);

        const analyzedRows = await fetchAnalysisForEntries(currentEntries, activeTf);
        if (!active) return;
        setRows(analyzedRows);
        setUpdatedAt(new Date().toISOString());
      } catch (err) {
        if (!active) return;
        console.error("[WatchlistTable] Yükleme hatası:", err);
      } finally {
        if (active) setIsInitialLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Manual refresh callback
  const refresh = useCallback(async (tf?: TimeframeKey) => {
    const targetTf = tf ?? timeframe;
    setRefreshing(true);
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      let currentEntries: WatchEntry[] = [...DEFAULT_WATCHLIST];
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.watchlist)) {
          currentEntries = json.watchlist;
        }
      }
      setEntries(currentEntries);

      const analyzedRows = await fetchAnalysisForEntries(currentEntries, targetTf);
      setRows(analyzedRows);
      setUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error("[WatchlistTable] Yenileme hatası:", err);
      setNotice({
        type: "error",
        text: "Takip listesi yenilenirken bir sorun oluştu.",
      });
    } finally {
      setRefreshing(false);
    }
  }, [timeframe]);

  const handleTimeframeChange = async (newTf: TimeframeKey) => {
    setTimeframe(newTf);
    void refresh(newTf);

    try {
      await fetch("/api/timeframe/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panel: "watchlist", timeframe: newTf }),
      });
      setNotice({
        type: "success",
        text: `✓ Takip listesi periyodu ${TIMEFRAMES[newTf]?.label ?? newTf} olarak güncellendi (timeframe-settings.md kaydedildi).`,
      });
    } catch (err) {
      console.error("[WatchlistTable] Periyot kaydedilemedi:", err);
    }
  };

  // Periodic auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      void refresh(timeframe);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval, timeframe]);

  // Notice auto-dismiss timer
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  // Add a new stock/asset to watchlist.md via API
  const handleAdd = async (ticker: string, type: AssetType, name?: string): Promise<boolean> => {
    const cleanTicker = ticker.trim().toUpperCase();
    if (entries.some((e) => e.ticker.toUpperCase() === cleanTicker)) {
      setNotice({
        type: "error",
        text: `${cleanTicker} zaten takip listenizde mevcut.`,
      });
      return false;
    }

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: cleanTicker, type, name }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Eklenemedi");
      }

      const updatedList: WatchEntry[] = json.watchlist;
      setEntries(updatedList);

      // Set new item into loading row state
      setRows((prev) => ({
        ...prev,
        [cleanTicker]: { status: "loading" },
      }));

      setNotice({
        type: "success",
        text: `✓ ${cleanTicker} takip listesine ve watchlist.md dosyasına eklendi.`,
      });

      // Analyze the newly added item in background
      void fetchSingleSymbolAnalysis(cleanTicker, type, timeframe).then((analyzedRow) => {
        setRows((prev) => ({
          ...prev,
          [cleanTicker]: analyzedRow,
        }));
      });

      return true;
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Sembol eklenirken hata oluştu.",
      });
      return false;
    }
  };

  // Remove a stock/asset from watchlist.md via API
  const handleRemove = async (ticker: string) => {
    const cleanTicker = ticker.trim().toUpperCase();
    setRemovingTicker(cleanTicker);
    try {
      const res = await fetch(`/api/watchlist?ticker=${encodeURIComponent(cleanTicker)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Silinemedi");
      }

      setEntries((prev) => prev.filter((e) => e.ticker.toUpperCase() !== cleanTicker));
      setRows((prev) => {
        const next = { ...prev };
        delete next[cleanTicker];
        return next;
      });

      setNotice({
        type: "success",
        text: `✓ ${cleanTicker} takip listesinden (watchlist.md) çıkarıldı.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Sembol silinirken hata oluştu.",
      });
    } finally {
      setRemovingTicker(null);
    }
  };

  const existingTickers = entries.map((e) => e.ticker);

  return (
    <div className="w-full">
      {/* Header section */}
      <div className="relative z-30 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-zinc-100">Takip Listesi</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              watchlist.md ({entries.length} varlık)
            </span>
            <span className="inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-sky-300">
              {TIMEFRAMES[timeframe]?.label ?? timeframe}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Varlıklar doğrudan{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-zinc-300">
              watchlist.md
            </code>{" "}
            dosyasından okunur. {TIMEFRAMES[timeframe]?.label ?? "Günlük"} mum ve göstergeleri hesaplanır ·{" "}
            {updatedAt
              ? `son güncelleme ${new Date(updatedAt).toLocaleTimeString("tr-TR")}`
              : isInitialLoading
              ? "yükleniyor…"
              : "hazır"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TimeframeSelector
            value={timeframe}
            onChange={handleTimeframeChange}
            disabled={refreshing}
            size="sm"
          />
          <AutoRefreshControl
            intervalSeconds={refreshInterval}
            onIntervalChange={(sec) => setRefreshInterval(sec)}
            onRefresh={() => void refresh(timeframe)}
            isRefreshing={refreshing}
            lastUpdated={updatedAt}
            storageKey="watchlist_refresh_interval"
            size="md"
            align="right"
          />
        </div>
      </div>

      {/* Notification banner */}
      {notice && (
        <div
          className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs sm:text-sm transition animate-in fade-in ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          <span>{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            className="ml-2 text-zinc-400 hover:text-zinc-200"
            title="Kapat"
          >
            ✕
          </button>
        </div>
      )}

      {/* Searchable Combobox & Quick Add Bar */}
      <div className="relative z-20 mb-4 rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Listeye Yeni Hisse veya Emtia Ekle
            </label>
            <WatchlistCombobox
              onAdd={handleAdd}
              existingTickers={existingTickers}
              disabled={refreshing}
            />
          </div>

          {/* Quick recommendations chips */}
          <div className="flex flex-col gap-1.5 lg:items-end">
            <span className="text-[11px] text-zinc-500">Hızlı öneriler:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_SUGGESTIONS.filter(
                (q) => !existingTickers.includes(q.ticker)
              ).slice(0, 4).map((sug) => (
                <button
                  key={sug.ticker}
                  type="button"
                  onClick={() => void handleAdd(sug.ticker, sug.type, sug.name)}
                  className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
                >
                  + {sug.ticker.replace(/\.IS$/, "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">Sembol</th>
              <th className="px-4 py-3 text-right font-medium">Fiyat</th>
              <th className="px-4 py-3 text-right font-medium">Günlük</th>
              <th className="px-4 py-3 text-right font-medium">Teknik</th>
              <th className="px-4 py-3 text-right font-medium">Temel</th>
              <th className="px-4 py-3 text-right font-medium">Skor</th>
              <th className="px-4 py-3 text-right font-medium">Sinyal</th>
              <th className="px-3 py-3 text-center font-medium w-16">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <p className="text-sm font-medium text-zinc-400">Takip listeniz boş</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Yukarıdaki arama kutusundan hisse arayarak listeye ekleyebilirsiniz.
                  </p>
                </td>
              </tr>
            ) : (
              entries.map((w) => {
                const row = rows[w.ticker];
                const data = row?.data;
                const up = (data?.change ?? 0) >= 0;
                const isRemoving = removingTicker === w.ticker;

                return (
                  <tr
                    key={w.ticker}
                    className={`border-b border-zinc-800/70 last:border-0 transition hover:bg-zinc-900/40 ${
                      isRemoving ? "opacity-30 pointer-events-none" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/symbol/${encodeURIComponent(w.ticker)}`}
                          className="font-medium text-zinc-100 hover:text-sky-400 transition"
                        >
                          {w.ticker}
                        </Link>
                        {w.type === "gold" && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                            Altın
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                          {data?.name ?? w.name ?? (w.type === "gold" ? "Ons Altın Vadeli" : "Hisse")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                      {!data ? <span className="text-zinc-600">…</span> : formatPrice(data.price, data.currency)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        !data ? "text-zinc-600" : up ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {data ? formatPercent(data.changePercent) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {data ? formatSigned(data.tech.score) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {data
                        ? data.fund
                          ? data.fund.score == null
                            ? "yok"
                            : formatSigned(data.fund.score)
                          : "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-100">
                      {data ? formatSigned(data.score) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row?.status === "error" ? (
                        <span className="text-xs text-red-500" title={row.error}>
                          veri yok
                        </span>
                      ) : data ? (
                        <SignalBadge signal={data.signal} size="sm" />
                      ) : (
                        <span className="text-zinc-600">…</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void handleRemove(w.ticker)}
                        disabled={isRemoving}
                        className="group inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                        title={`${w.ticker} takip listesinden ve watchlist.md'den kaldır`}
                      >
                        <svg
                          className="h-4 w-4 transition group-hover:scale-110"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <p>
          💡 Bu liste doğrudan projedeki{" "}
          <strong className="text-zinc-400 font-mono">watchlist.md</strong> dosyasına kaydedilir.
          Dosyayı el ile açıp düzenleyebilir veya arayüzden yönetebilirsiniz.
        </p>
        <p className="text-zinc-600">
          Karar destek aracıdır, yatırım tavsiyesi değildir.
        </p>
      </div>
    </div>
  );
}

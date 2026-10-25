"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPercent, formatPrice } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";
import type { TrackEntry } from "@/lib/tracklist";

type RowData = {
  entry: TrackEntry;
  currentData?: AnalysisResult;
  loading: boolean;
  error?: string;
};

export default function TrackListTable() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<"auto" | "cards" | "table">("auto");

  const loadTracklist = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/tracklist", { cache: "no-store" });
      if (!res.ok) throw new Error("Takip listesi alınamadı");
      const json = await res.json();

      const entries: TrackEntry[] = json.tracklist || [];

      // Initial state with loading true
      const initialRows: RowData[] = entries.map((e) => ({ entry: e, loading: true }));
      setRows(initialRows);

      // Fetch current data for each
      for (const e of entries) {
        const tf = e.timeframe || "1d";
        fetch(
          `/api/analyze?ticker=${encodeURIComponent(e.ticker)}&type=${e.type}&timeframe=${tf}`,
          { cache: "no-store" }
        )
          .then((r) => r.json())
          .then((data) => {
            setRows((prev) =>
              prev.map((row) =>
                row.entry.ticker === e.ticker && row.entry.date === e.date
                  ? { ...row, currentData: data, loading: false }
                  : row
              )
            );
          })
          .catch(() => {
            setRows((prev) =>
              prev.map((row) =>
                row.entry.ticker === e.ticker && row.entry.date === e.date
                  ? { ...row, error: "Veri alınamadı", loading: false }
                  : row
              )
            );
          });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTracklist();
  }, [loadTracklist]);

  const handleRefresh = () => {
    void loadTracklist(true);
  };

  const handleRemove = async (ticker: string, date: string) => {
    try {
      const res = await fetch(
        `/api/tracklist?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Silinemedi");

      setRows((prev) => prev.filter((r) => !(r.entry.ticker === ticker && r.entry.date === date)));
      setNotice({ type: "success", text: `${ticker} takipten çıkarıldı.` });
    } catch {
      setNotice({ type: "error", text: "Silinirken hata oluştu." });
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="text-zinc-400 text-sm py-8 text-center animate-pulse">
        Sinyal Karşılaştırma Listesi Yükleniyor...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              Sinyal Performansı (Takip Listem)
            </h2>
            <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400 hidden sm:inline-flex">
              takiplistem.md
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Geçmişte &quot;Takibe Al&quot; dediğiniz hisselerin kayıt anındaki fiyatı ile güncel fiyatını karşılaştırır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-0.5">
            <button
              onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white transition"
              title="Görünüm Değiştir"
            >
              <span>{viewMode === "table" ? "💻 Tablo" : "📱 Kart"}</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600/20 px-3.5 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-600/30 disabled:opacity-50 transition border border-sky-500/30 active:scale-95"
          >
            {loading ? "Karşılaştırılıyor..." : "Şimdi Karşılaştır"}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-xl border px-4 py-2.5 text-xs sm:text-sm ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {notice.text}
          <button onClick={() => setNotice(null)} className="ml-2 float-right">
            ✕
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* 1. MOBILE RESPONSIVE CARDS VIEW                                 */}
      {/* ================================================================ */}
      <div
        className={`${
          viewMode === "table" ? "hidden" : viewMode === "cards" ? "block" : "block md:hidden"
        } space-y-3`}
      >
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
            Henüz takip edilen kayıt yok. Ana ekrandan analizleri görüntülerken &quot;Takibe Al&quot; diyerek buraya ekleyebilirsiniz.
          </div>
        ) : (
          rows.map((row, idx) => {
            const e = row.entry;
            const d = new Date(e.date);
            const dateStr =
              d.toLocaleDateString("tr-TR") +
              " " +
              d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

            const currPrice = row.currentData?.price;
            const percentChange = currPrice && e.price ? (currPrice - e.price) / e.price : 0;

            let success: boolean | null = null;
            if (currPrice && e.price) {
              if (e.signal.toUpperCase() === "AL" || e.signal.toUpperCase() === "GÜÇLÜ AL") {
                success = currPrice > e.price;
              } else if (e.signal.toUpperCase() === "SAT" || e.signal.toUpperCase() === "GÜÇLÜ SAT") {
                success = currPrice < e.price;
              }
            }

            return (
              <div
                key={`track-card-${e.ticker}-${e.date}-${idx}`}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-md backdrop-blur-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/symbol/${encodeURIComponent(e.ticker)}`}
                      className="font-mono text-base font-bold text-sky-400 hover:text-sky-300"
                    >
                      {e.ticker}
                    </Link>
                    <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                      {e.timeframe || "1d"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Success Pill */}
                    {row.loading ? (
                      <span className="text-xs text-zinc-500">…</span>
                    ) : success === true ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        ✅ Başarılı
                      </span>
                    ) : success === false ? (
                      <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        ❌ Başarısız
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">—</span>
                    )}

                    <button
                      onClick={() => handleRemove(e.ticker, e.date)}
                      className="text-zinc-500 hover:text-red-400 p-1"
                      title="Sil"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Kayıt Sinyali & Fiyatı:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          e.signal.includes("AL")
                            ? "bg-emerald-500/20 text-emerald-400"
                            : e.signal.includes("SAT")
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-700/50 text-zinc-300"
                        }`}
                      >
                        {e.signal}
                      </span>
                      <span className="font-mono tabular-nums text-zinc-300">
                        {formatPrice(e.price, row.currentData?.currency || "TRY")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Güncel Fiyat & Değişim:</span>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="font-mono font-bold tabular-nums text-zinc-100">
                        {row.loading
                          ? "…"
                          : currPrice
                          ? formatPrice(currPrice, row.currentData?.currency || "TRY")
                          : "Hata"}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums text-[11px] ${
                          percentChange > 0
                            ? "text-emerald-400"
                            : percentChange < 0
                            ? "text-red-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {row.loading ? "…" : currPrice ? formatPercent(percentChange * 100) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Date */}
                <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-500">
                  <span>İşlem Tarihi: {dateStr}</span>
                  <Link
                    href={`/symbol/${encodeURIComponent(e.ticker)}`}
                    className="text-sky-400 hover:text-sky-300 font-medium"
                  >
                    Detay →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================================================================ */}
      {/* 2. DESKTOP TABLE VIEW                                           */}
      {/* ================================================================ */}
      <div
        className={`${
          viewMode === "cards" ? "hidden" : viewMode === "table" ? "block" : "hidden md:block"
        } overflow-x-auto rounded-xl border border-zinc-800`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">Sembol</th>
              <th className="px-4 py-3 font-medium">İşlem Tarihi</th>
              <th className="px-4 py-3 text-center font-medium">Periyot</th>
              <th className="px-4 py-3 text-right font-medium">Kayıt Sinyali</th>
              <th className="px-4 py-3 text-right font-medium">Kayıt Fiyatı</th>
              <th className="px-4 py-3 text-right font-medium">Güncel Fiyat</th>
              <th className="px-4 py-3 text-right font-medium">Değişim %</th>
              <th className="px-4 py-3 text-center font-medium">Başarı</th>
              <th className="px-3 py-3 text-center font-medium w-16">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-500">
                  Henüz takip edilen kayıt yok. Ana ekrandan analizleri görüntülerken &quot;Takibe Al&quot; diyerek buraya ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const e = row.entry;
                const d = new Date(e.date);
                const dateStr =
                  d.toLocaleDateString("tr-TR") +
                  " " +
                  d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

                const currPrice = row.currentData?.price;
                const percentChange = currPrice && e.price ? (currPrice - e.price) / e.price : 0;

                let success: boolean | null = null;
                if (currPrice && e.price) {
                  if (e.signal.toUpperCase() === "AL" || e.signal.toUpperCase() === "GÜÇLÜ AL") {
                    success = currPrice > e.price;
                  } else if (e.signal.toUpperCase() === "SAT" || e.signal.toUpperCase() === "GÜÇLÜ SAT") {
                    success = currPrice < e.price;
                  }
                }

                return (
                  <tr key={e.ticker + e.date + idx} className="border-b border-zinc-800/70 hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      <Link href={`/symbol/${encodeURIComponent(e.ticker)}`} className="hover:text-sky-400">
                        {e.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{dateStr}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-sky-300">
                        {e.timeframe || "1d"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          e.signal.includes("AL")
                            ? "bg-emerald-500/20 text-emerald-400"
                            : e.signal.includes("SAT")
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-700/50 text-zinc-300"
                        }`}
                      >
                        {e.signal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {formatPrice(e.price, row.currentData?.currency || "TRY")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-100">
                      {row.loading
                        ? "…"
                        : currPrice
                        ? formatPrice(currPrice, row.currentData?.currency || "TRY")
                        : "Hata"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        percentChange > 0
                          ? "text-emerald-400"
                          : percentChange < 0
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {row.loading ? "…" : currPrice ? formatPercent(percentChange * 100) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.loading
                        ? "…"
                        : success === true
                        ? "✅ Başarılı"
                        : success === false
                        ? "❌ Başarısız"
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleRemove(e.ticker, e.date)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                        title="Sil"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>
  );
}

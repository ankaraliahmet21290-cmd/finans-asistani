"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import TimeframeSelector from "./TimeframeSelector";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";
import type { AnalysisResult } from "@/lib/types";
import type { BistCompany } from "@/lib/bist";

export default function SelectedCompanyPreview({
  company,
  timeframe = "1d",
  onTimeframeChange,
  onClose,
}: {
  company: BistCompany;
  timeframe?: TimeframeKey;
  onTimeframeChange?: (tf: TimeframeKey) => void;
  onClose: () => void;
}) {
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeKey>(timeframe);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackNotice, setTrackNotice] = useState<{type: "success" | "error", text: string} | null>(null);

  useEffect(() => {
    setActiveTimeframe(timeframe);
  }, [timeframe]);

  const handleTimeframeChange = (newTf: TimeframeKey) => {
    setActiveTimeframe(newTf);
    if (onTimeframeChange) {
      onTimeframeChange(newTf);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/analyze?ticker=${encodeURIComponent(company.ticker)}&type=stock&timeframe=${activeTimeframe}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Analiz verisi alınamadı");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company.ticker, activeTimeframe]);

  const up = (data?.change ?? 0) >= 0;

  const handleTrack = async () => {
    if (!data) return;
    setAddingTrack(true);
    setTrackNotice(null);
    try {
      const res = await fetch("/api/tracklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: company.ticker,
          type: "stock",
          price: data.price,
          signal: data.signal,
          timeframe: activeTimeframe,
        }),
      });
      if (!res.ok) throw new Error("Eklenemedi");
      setTrackNotice({ type: "success", text: "Takip Listem'e eklendi!" });
      setTimeout(() => setTrackNotice(null), 3000);
    } catch (err) {
      setTrackNotice({ type: "error", text: "Eklenirken hata oluştu" });
    } finally {
      setAddingTrack(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-zinc-900/80 to-zinc-900 p-5 shadow-2xl backdrop-blur-md transition">
      {/* Header bar with TimeframeSelector and Close */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Seçili Şirket Analiz Özeti
          </span>
          <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-300">
            {TIMEFRAMES[activeTimeframe]?.label ?? activeTimeframe}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TimeframeSelector
            value={activeTimeframe}
            onChange={handleTimeframeChange}
            disabled={loading}
            size="sm"
            label="Periyot"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            title="Kapat"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-50">
              {company.code}
            </h3>
            <span className="text-xs text-zinc-400">{company.name}</span>
          </div>

          {loading ? (
            <div className="mt-3 h-8 w-40 animate-pulse rounded bg-zinc-800" />
          ) : data ? (
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-zinc-100">
                {formatPrice(data.price, data.currency)}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  up ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatPercent(data.changePercent)}
              </span>
            </div>
          ) : null}
        </div>

        {data && (
          <div className="flex flex-col items-end gap-1.5">
            <SignalBadge signal={data.signal} size="md" />
            <div className="text-right">
              <span className="text-xs text-zinc-400">Nihai Skor: </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  data.score > 0
                    ? "text-emerald-400"
                    : data.score < 0
                    ? "text-red-400"
                    : "text-zinc-300"
                }`}
              >
                {formatSigned(data.score)}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Teknik: {formatSigned(data.tech.score)} · Temel:{" "}
              {data.fund?.score != null ? formatSigned(data.fund.score) : "veri yok"}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800/60" />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
          Analiz verisi alınırken hata oluştu: {error}
        </div>
      )}

      {trackNotice && (
        <div className={`mt-2 rounded-xl border p-3 text-xs ${trackNotice.type === "success" ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300" : "border-red-900/60 bg-red-950/30 text-red-300"}`}>
          {trackNotice.text}
        </div>
      )}

      {data && (
        <div className="mt-4 grid gap-3 border-t border-zinc-800/80 pt-4 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Öne Çıkan Teknik Sinyaller
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
              {data.tech.items.slice(0, 3).map((item) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      item.point > 0
                        ? "bg-emerald-400"
                        : item.point < 0
                        ? "bg-red-400"
                        : "bg-zinc-600"
                    }`}
                  />
                  <span>
                    <strong className="text-zinc-200">{item.name}:</strong>{" "}
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Temel Analiz Göstergeleri
            </h4>
            {data.fund ? (
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                {data.fund.metrics.slice(0, 3).map((m) => (
                  <li key={m.key} className="flex items-center justify-between">
                    <span className="text-zinc-400">{m.label}</span>
                    <span className="font-mono font-medium text-zinc-200">
                      {m.display}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Temel veri bulunamadı, karar teknik göstergelerle üretildi.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
        <span className="text-[11px] text-zinc-500">
          Mum grafiği, Bollinger bantları, RSI & MACD panelleri için detay sayfasına gidin.
        </span>
        <div className="flex items-center gap-2">
          {data && (
            <button
              onClick={handleTrack}
              disabled={addingTrack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-400 shadow-sm transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              {addingTrack ? "Ekleniyor..." : "Takibe Al"}
            </button>
          )}
          <Link
            href={`/symbol/${encodeURIComponent(company.ticker)}?tf=${activeTimeframe}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            Tüm Grafikleri ve Detayları Gör →
          </Link>
        </div>
      </div>
    </div>
  );
}

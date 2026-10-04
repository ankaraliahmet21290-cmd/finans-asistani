"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SignalBadge from "./SignalBadge";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";
import { WATCHLIST } from "@/lib/watchlist";

type Row =
  | { status: "loading"; data?: AnalysisResult; error?: string }
  | { status: "ok"; data: AnalysisResult; error?: string }
  | { status: "error"; data?: AnalysisResult; error: string };

const initialRows = (): Record<string, Row> =>
  Object.fromEntries(WATCHLIST.map((w) => [w.ticker, { status: "loading" } as Row]));

async function fetchRows(): Promise<Record<string, Row>> {
  const entries = await Promise.all(
    WATCHLIST.map(async (w): Promise<[string, Row]> => {
      try {
        const res = await fetch(`/api/analyze?ticker=${encodeURIComponent(w.ticker)}&type=${w.type}`, {
          cache: "no-store",
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        return [w.ticker, { status: "ok", data: body as AnalysisResult }];
      } catch (e) {
        return [
          w.ticker,
          { status: "error", error: e instanceof Error ? e.message : "Veri alınamadı" },
        ];
      }
    })
  );
  return Object.fromEntries(entries);
}

export default function WatchlistTable() {
  const [rows, setRows] = useState<Record<string, Row>>(initialRows);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const next = await fetchRows();
      if (!active) return;
      setRows((prev) => {
        const merged: Record<string, Row> = { ...next };
        for (const w of WATCHLIST) {
          if (merged[w.ticker].status === "error" && prev[w.ticker]?.data) {
            merged[w.ticker] = { ...merged[w.ticker], data: prev[w.ticker].data } as Row;
          }
        }
        return merged;
      });
      setUpdatedAt(new Date().toISOString());
    })();

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void fetchRows()
      .then((next) => {
        setRows(next);
        setUpdatedAt(new Date().toISOString());
      })
      .finally(() => setRefreshing(false));
  }, []);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Takip Listesi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Teknik + temel analiz skorları ·{" "}
            {updatedAt
              ? `son güncelleme ${new Date(updatedAt).toLocaleTimeString("tr-TR")}`
              : "yükleniyor…"}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
        >
          {refreshing ? "Güncelleniyor…" : "Yenile"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">Sembol</th>
              <th className="px-4 py-3 text-right font-medium">Fiyat</th>
              <th className="px-4 py-3 text-right font-medium">Günlük</th>
              <th className="px-4 py-3 text-right font-medium">Teknik</th>
              <th className="px-4 py-3 text-right font-medium">Temel</th>
              <th className="px-4 py-3 text-right font-medium">Skor</th>
              <th className="px-4 py-3 text-right font-medium">Sinyal</th>
            </tr>
          </thead>
          <tbody>
            {WATCHLIST.map((w) => {
              const row = rows[w.ticker];
              const data = row?.data;
              const up = (data?.change ?? 0) >= 0;

              return (
                <tr
                  key={w.ticker}
                  className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/symbol/${encodeURIComponent(w.ticker)}`}
                      className="font-medium text-zinc-100 hover:text-sky-400"
                    >
                      {w.ticker}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-500">
                      {data?.name ?? (w.type === "gold" ? "Altın" : "Hisse")}
                    </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Bu sistem karar destek aracıdır, yatırım tavsiyesi değildir. Sinyaller geçmiş veriye dayanır.
      </p>
    </div>
  );
}

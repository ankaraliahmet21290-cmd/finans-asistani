import SignalBadge from "./SignalBadge";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

export default function SignalCard({ result }: { result: AnalysisResult }) {
  const up = result.change >= 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-zinc-100">{result.ticker}</h1>
            <span className="text-sm text-zinc-500">{result.name}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-zinc-50">
              {formatPrice(result.price, result.currency)}
            </span>
            <span
              className={`text-sm font-medium tabular-nums ${up ? "text-emerald-500" : "text-red-500"}`}
            >
              {formatPercent(result.changePercent)}
            </span>
          </div>
          {result.type === "gold" && result.gramGoldTRY != null && (
            <p className="mt-1 text-xs text-zinc-500">
              Gram altın ≈ {formatPrice(result.gramGoldTRY, "TRY")}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <SignalBadge signal={result.signal} size="lg" />
          <div className="text-right text-sm text-zinc-400">
            <div>
              Nihai skor{" "}
              <span className="font-semibold tabular-nums text-zinc-200">
                {formatSigned(result.score)}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Teknik {formatSigned(result.tech.score, 2)}
              {result.fund
                ? ` · Temel ${result.fund.score == null ? "veri yok" : formatSigned(result.fund.score, 2)}`
                : " · Temel analiz yok (altın)"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

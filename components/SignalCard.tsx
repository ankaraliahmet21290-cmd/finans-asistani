import SignalBadge from "./SignalBadge";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

interface SignalCardProps {
  result: AnalysisResult;
  activeTab?: "hybrid" | "tech" | "fund";
}

export default function SignalCard({ result, activeTab = "hybrid" }: SignalCardProps) {
  const up = result.change >= 0;

  // Determine signal and score according to activeTab
  let displaySignal = result.signal;
  let displayScore = result.score;
  let scoreTitle = "Karma Sinyal Skoru";
  let scoreSub = `Teknik %60 (${formatSigned(result.tech.score)}) · Temel %40 (${
    result.fund?.score != null ? formatSigned(result.fund.score) : "veri yok"
  })`;

  if (activeTab === "tech") {
    displaySignal = result.tech.signal;
    displayScore = result.tech.score;
    scoreTitle = "Teknik Analiz Skoru";
    const lastRsi = result.ind.rsi.at(-1);
    const lastAdx = result.tech.trendStrength?.adx;
    scoreSub = `Periyot: ${result.timeframe ?? "1d"}${lastRsi != null ? ` · RSI: ${lastRsi.toFixed(1)}` : ""}${
      lastAdx != null ? ` · ADX: ${lastAdx.toFixed(1)}` : ""
    }`;
  } else if (activeTab === "fund") {
    displaySignal = result.fund?.signal ?? "TUT";
    displayScore = result.fund?.score ?? 0;
    scoreTitle = "Temel Bilanço Skoru";
    scoreSub = result.fund
      ? `F/K: ${result.fundamentals?.pe != null ? result.fundamentals.pe.toFixed(1) : "—"} · PD/DD: ${
          result.fundamentals?.pb != null ? result.fundamentals.pb.toFixed(2) : "—"
        }${result.fundamentals?.peg != null ? ` · PEG: ${result.fundamentals.peg.toFixed(2)}` : ""}`
      : "Temel analiz verisi mevcut değil (Altın)";
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-5 shadow-xl backdrop-blur-md">
      {/* Decorative gradient blur in background */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl opacity-20 transition-colors ${
          displaySignal === "AL"
            ? "bg-emerald-500"
            : displaySignal === "SAT"
            ? "bg-red-500"
            : "bg-amber-500"
        }`}
      />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-300">
              {result.ticker}
            </span>
            {result.timeframe && (
              <span className="rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-400">
                {result.timeframe.toUpperCase()}
              </span>
            )}
            {activeTab === "hybrid" && result.hybridAssessment && (
              <span className="hidden sm:inline-flex rounded-md bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                {result.hybridAssessment.label}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              {result.name}
            </h1>
          </div>

          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tabular-nums tracking-tight text-zinc-50">
              {formatPrice(result.price, result.currency)}
            </span>
            <span
              className={`flex items-center gap-1 text-sm font-bold tabular-nums ${
                up ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <span>{up ? "▲" : "▼"}</span>
              <span>{formatPercent(result.changePercent)}</span>
              <span className="text-xs font-normal opacity-75">
                ({formatSigned(result.change, 2)})
              </span>
            </span>
          </div>

          {result.type === "gold" && result.gramGoldTRY != null && (
            <p className="mt-1.5 text-xs text-amber-400/90 font-medium">
              🪙 Tahmini Gram Altın: <strong>{formatPrice(result.gramGoldTRY, "TRY")}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-2">
            <SignalBadge signal={displaySignal} size="lg" />
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-2.5 text-right backdrop-blur-sm">
            <div className="text-xs font-medium text-zinc-400 flex items-center justify-end gap-1.5">
              <span>{scoreTitle}:</span>
              <span
                className={`font-mono text-sm font-extrabold tabular-nums ${
                  displayScore > 0
                    ? "text-emerald-400"
                    : displayScore < 0
                    ? "text-red-400"
                    : "text-zinc-300"
                }`}
              >
                {formatSigned(displayScore)}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 font-medium">{scoreSub}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

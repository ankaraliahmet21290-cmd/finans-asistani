"use client";

import { useMemo, memo } from "react";
import { toTradingViewSymbol, toTradingViewInterval } from "@/lib/tradingview";

interface TradingViewChartProps {
  ticker: string;
  type?: string;
  timeframe?: string;
  height?: number | string;
}

function TradingViewChartComponent({
  ticker,
  type,
  timeframe = "1d",
  height = 540,
}: TradingViewChartProps) {
  const tvSymbol = toTradingViewSymbol(ticker, type);
  const tvInterval = toTradingViewInterval(timeframe);

  // Build clean, isolated iframe URL for TradingView widget.
  // This eliminates parent-script DOM injection and "contentWindow is not available" cross-origin errors.
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: tvInterval,
      hidesidetoolbar: "0",
      symboledit: "1",
      saveimage: "1",
      toolbarbg: "rgba(10,10,15,1)",
      theme: "dark",
      style: "1",
      timezone: "Europe/Istanbul",
      locale: "tr",
      enablepublishing: "0",
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, tvInterval]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0f] shadow-xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-2.5 bg-zinc-950/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-zinc-200">TradingView Gelişmiş Grafik</span>
          <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] text-sky-400 border border-sky-500/30">
            {tvSymbol}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>Periyot: <strong className="text-zinc-200">{timeframe}</strong></span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">Tam Çizim & Hacim Araçları</span>
        </div>
      </div>

      {/* Clean, Isolated Iframe */}
      <iframe
        key={`${tvSymbol}-${tvInterval}`}
        src={iframeSrc}
        title={`TradingView Chart ${tvSymbol}`}
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          border: "none",
        }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export default memo(TradingViewChartComponent);

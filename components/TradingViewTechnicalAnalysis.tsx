"use client";

import { useMemo, memo } from "react";
import { toTradingViewSymbol, toTradingViewTechnicalInterval } from "@/lib/tradingview";

interface TradingViewTechnicalAnalysisProps {
  ticker: string;
  type?: string;
  timeframe?: string;
  height?: number | string;
}

function TradingViewTechnicalAnalysisComponent({
  ticker,
  type,
  timeframe = "1d",
  height = 430,
}: TradingViewTechnicalAnalysisProps) {
  const tvSymbol = toTradingViewSymbol(ticker, type);
  const widgetInterval = toTradingViewTechnicalInterval(timeframe);

  const iframeSrc = useMemo(() => {
    const config = {
      interval: widgetInterval,
      width: "100%",
      isTransparent: true,
      height: "100%",
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "tr",
      colorTheme: "dark",
    };
    return `https://www.tradingview-widget.com/embed-widget/technical-analysis/?locale=tr&tvwidgetsymbol=${encodeURIComponent(
      tvSymbol
    )}#${encodeURIComponent(JSON.stringify(config))}`;
  }, [tvSymbol, widgetInterval]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0f] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              TradingView Teknik Analiz İbresi
            </h4>
            <p className="text-[11px] text-zinc-400">
              TradingView osilatörleri ve hareketli ortalamalarının anlık al/sat özeti (
              <span className="font-mono text-sky-400 font-semibold">{tvSymbol}</span>)
            </p>
          </div>
        </div>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300 border border-violet-500/20">
          TradingView Algoritması
        </span>
      </div>

      <div style={{ height: typeof height === "number" ? `${height}px` : height }} className="w-full">
        <iframe
          key={`${tvSymbol}-${widgetInterval}`}
          src={iframeSrc}
          title={`TradingView Technical Analysis ${tvSymbol}`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default memo(TradingViewTechnicalAnalysisComponent);

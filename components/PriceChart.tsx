"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineWidth,
} from "lightweight-charts";
import type { BollingerPoint, Candle } from "@/lib/types";

interface PriceChartProps {
  candles: Candle[];
  sma50: number[];
  sma200: number[];
  bb: BollingerPoint[];
}

const toTime = (date: string): string => date.slice(0, 10);

export default function PriceChart({ candles, sma50, sma200, bb }: PriceChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || candles.length === 0) return;

    const chart: IChartApi = createChart(el, {
      height: 420,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a1",
      },
      grid: {
        vertLines: { color: "rgba(120,130,150,0.12)" },
        horzLines: { color: "rgba(120,130,150,0.12)" },
      },
      rightPriceScale: { borderColor: "rgba(120,130,150,0.25)" },
      timeScale: { borderColor: "rgba(120,130,150,0.25)" },
    });

    const candleSeries: ISeriesApi<"Candlestick"> = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceLineVisible: false,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const offset = candles.length;
    const line = (
      values: number[],
      color: string,
      map: (v: number, index: number) => number | null,
      lineWidth: LineWidth = 1
    ) => {
      if (values.length === 0) return;
      const start = offset - values.length;
      if (start < 0) return;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        values
          .map((v, i) => {
            const value = map(v, i);
            return value == null || !Number.isFinite(value)
              ? null
              : { time: toTime(candles[start + i].date), value };
          })
          .filter((p): p is { time: ReturnType<typeof toTime>; value: number } => p !== null)
      );
    };

    line(sma50, "#2962ff", (v) => v, 1);
    line(sma200, "#ff6d00", (v) => v, 1);
    line(
      bb.map((b) => b.upper),
      "rgba(41,98,255,0.5)",
      (v) => v
    );
    line(
      bb.map((b) => b.lower),
      "rgba(41,98,255,0.5)",
      (v) => v
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles, sma50, sma200, bb]);

  return <div ref={ref} className="h-[420px] w-full" />;
}

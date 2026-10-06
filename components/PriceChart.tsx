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
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { BollingerPoint, Candle } from "@/lib/types";

interface PriceChartProps {
  candles: Candle[];
  sma50: number[];
  sma200: number[];
  bb: BollingerPoint[];
  timeframe?: string;
}

export default function PriceChart({ candles, sma50, sma200, bb, timeframe }: PriceChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || candles.length === 0) return;

    const isIntraday =
      timeframe === "1h" ||
      timeframe === "2h" ||
      timeframe === "4h" ||
      candles.some((c, i) => i > 0 && c.date.slice(0, 10) === candles[i - 1].date.slice(0, 10));

    const toTime = (dateStr: string): Time => {
      if (isIntraday) {
        return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
      }
      return dateStr.slice(0, 10);
    };

    // Filter and ensure strictly ascending unique times
    const candleData: { time: Time; open: number; high: number; low: number; close: number }[] = [];
    const candleTimeByIndex = new Map<number, Time>();
    const seenTimes = new Set<string | number>();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const t = toTime(c.date);
      const key = typeof t === "number" ? t : String(t);
      if (seenTimes.has(key)) continue;
      seenTimes.add(key);
      candleData.push({
        time: t,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
      candleTimeByIndex.set(i, t);
    }

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
      timeScale: {
        borderColor: "rgba(120,130,150,0.25)",
        timeVisible: isIntraday,
        secondsVisible: false,
      },
    });

    const candleSeries: ISeriesApi<"Candlestick"> = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceLineVisible: false,
    });
    candleSeries.setData(candleData);

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

      const linePoints: { time: Time; value: number }[] = [];
      const lineSeen = new Set<string | number>();

      for (let i = 0; i < values.length; i++) {
        const val = map(values[i], i);
        if (val == null || !Number.isFinite(val)) continue;
        const time = candleTimeByIndex.get(start + i);
        if (time == null) continue;
        const key = typeof time === "number" ? time : String(time);
        if (lineSeen.has(key)) continue;
        lineSeen.add(key);
        linePoints.push({ time, value: val });
      }

      series.setData(linePoints);
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

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles, sma50, sma200, bb, timeframe]);

  return (
    <div className="relative w-full overflow-hidden">
      <div ref={ref} className="h-[420px] w-full" />
    </div>
  );
}

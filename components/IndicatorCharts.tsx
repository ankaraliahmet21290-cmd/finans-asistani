"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import type { Candle, MacdPoint } from "@/lib/types";

interface SeriesProps {
  candles: Candle[];
  rsi: number[];
  macd: MacdPoint[];
}

function useChart(build: (chart: IChartApi, el: HTMLDivElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chart = createChart(el, {
      height: 190,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a1",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(120,130,150,0.10)" },
        horzLines: { color: "rgba(120,130,150,0.10)" },
      },
      rightPriceScale: { borderColor: "rgba(120,130,150,0.25)" },
      timeScale: { visible: false, borderColor: "rgba(120,130,150,0.25)" },
      handleScroll: false,
      handleScale: false,
    });

    build(chart, el);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

const timeAt = (candles: Candle[], index: number): Time | null =>
  candles[index] ? candles[index].date.slice(0, 10) : null;

export function RsiChart({ candles, rsi }: Omit<SeriesProps, "macd">) {
  const ref = useChart((chart) => {
    if (rsi.length === 0) return;
    const start = candles.length - rsi.length;
    if (start < 0) return;

    const times: Time[] = [];
    const values: { time: Time; value: number }[] = [];
    rsi.forEach((v, i) => {
      const t = timeAt(candles, start + i);
      if (t == null || !Number.isFinite(v)) return;
      times.push(t);
      values.push({ time: t, value: v });
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
    });
    rsiSeries.setData(values);

    for (const level of [30, 70]) {
      const s = chart.addSeries(LineSeries, {
        color: "rgba(245,158,11,0.7)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });
      s.setData(times.map((time) => ({ time, value: level })));
    }
  }, [candles, rsi]);

  return <div ref={ref} className="h-[190px] w-full" />;
}

export function MacdChart({ candles, macd }: Omit<SeriesProps, "rsi">) {
  const ref = useChart((chart) => {
    const points = macd
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.MACD != null && p.signal != null && p.histogram != null);
    if (points.length === 0) return;

    const start = candles.length - macd.length;
    if (start < 0) return;

    const timeOf = (i: number): Time | null => timeAt(candles, start + i);

    const hist = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    hist.setData(
      points.flatMap(({ p, i }) => {
        const time = timeOf(i);
        const value = p.histogram;
        if (time == null || value == null) return [];
        return [
          {
            time,
            value,
            color: value >= 0 ? "rgba(38,166,154,0.65)" : "rgba(239,83,80,0.65)",
          },
        ];
      })
    );

    const line = (pick: (p: MacdPoint) => number | undefined, color: string) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      series.setData(
        points.flatMap(({ p, i }) => {
          const time = timeOf(i);
          const value = pick(p);
          if (time == null || value == null) return [];
          return [{ time, value }];
        })
      );
    };

    line((p) => p.MACD, "#2962ff");
    line((p) => p.signal, "#ff6d00");
  }, [candles, macd]);

  return <div ref={ref} className="h-[190px] w-full" />;
}

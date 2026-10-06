import YahooFinance from "yahoo-finance2";
import type { Candle, Fundamentals, MacroPoint, TimeframeKey } from "./types";
import { getActiveRefreshConfig } from "./refresh-settings-storage";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  versionCheck: false,
});

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const ttl = getActiveRefreshConfig().cacheTtlMs;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearDataCache(): void {
  cache.clear();
}

export interface CandleResult {
  ticker: string;
  name: string;
  currency: string;
  timeframe: TimeframeKey;
  regularMarketPrice?: number | null;
  previousClose?: number | null;
  candles: Candle[];
  closes: number[];
}

function aggregateCandles(candles: Candle[], groupSize: number): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const c of chunk) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      if (c.volume != null) volume += c.volume;
    }
    result.push({
      date: chunk[0].date,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return result;
}

export async function getCandles(ticker: string, tf: TimeframeKey = "1d"): Promise<CandleResult> {
  return cached(`candles:${ticker}:${tf}`, async () => {
    const days =
      tf === "5m"
        ? 7
        : tf === "10m"
        ? 14
        : tf === "15m"
        ? 20
        : tf === "30m"
        ? 30
        : tf === "1h"
        ? 45
        : tf === "2h"
        ? 60
        : tf === "4h"
        ? 90
        : tf === "1wk"
        ? 730
        : tf === "1mo"
        ? 1460
        : 400;

    const period1 = new Date(Date.now() - days * 24 * 3600 * 1000);
    let interval: "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo" = "1d";
    if (tf === "5m" || tf === "10m") {
      interval = "5m";
    } else if (tf === "15m") {
      interval = "15m";
    } else if (tf === "30m") {
      interval = "30m";
    } else if (tf === "1h" || tf === "2h" || tf === "4h") {
      interval = "1h";
    } else if (tf === "1wk") {
      interval = "1wk";
    } else if (tf === "1mo") {
      interval = "1mo";
    } else {
      interval = "1d";
    }

    const res = await yf.chart(ticker, { period1, interval });

    const rawCandles: Candle[] = [];
    const quotes = res.quotes;
    for (let i = 0; i < quotes.length; i++) {
      const q = quotes[i];
      let close = q.close;
      // Yahoo Finance leaves close as null for ongoing/unsettled sessions; recover with regularMarketPrice
      if (close == null && i === quotes.length - 1 && res.meta.regularMarketPrice != null) {
        close = res.meta.regularMarketPrice;
      }
      if (close == null || q.open == null || q.high == null || q.low == null) continue;
      rawCandles.push({
        date: q.date.toISOString(),
        open: q.open,
        high: Math.max(q.high, close),
        low: Math.min(q.low, close),
        close,
        volume: q.volume ?? 0,
      });
    }

    if (rawCandles.length === 0) throw new Error(`${ticker} için ${tf} periyodunda fiyat verisi boş`);

    let candles = rawCandles;
    if (tf === "10m") {
      candles = aggregateCandles(rawCandles, 2);
    } else if (tf === "2h") {
      candles = aggregateCandles(rawCandles, 2);
    } else if (tf === "4h") {
      candles = aggregateCandles(rawCandles, 4);
    }

    return {
      ticker,
      name: res.meta.longName || res.meta.shortName || ticker,
      currency: res.meta.currency || "TRY",
      timeframe: tf,
      regularMarketPrice: res.meta.regularMarketPrice ?? null,
      previousClose: res.meta.previousClose ?? res.meta.chartPreviousClose ?? null,
      candles,
      closes: candles.map((c) => c.close),
    };
  });
}

export async function getFundamentals(ticker: string): Promise<Fundamentals> {
  return cached(`fundamentals:${ticker}`, async () => {
    const s = await yf.quoteSummary(ticker, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
    });

    const pe =
      (s.summaryDetail?.trailingPE as number | undefined) ??
      (s.summaryDetail?.forwardPE as number | undefined) ??
      null;

    const pb = (s.defaultKeyStatistics?.priceToBook as number | undefined) ?? null;
    const peg = (s.defaultKeyStatistics?.pegRatio as number | undefined) ?? null;
    const roe = (s.financialData?.returnOnEquity as number | undefined) ?? null;
    const roa = (s.financialData?.returnOnAssets as number | undefined) ?? null;
    const profitMargins = (s.financialData?.profitMargins as number | undefined) ?? null;
    const operatingMargins = (s.financialData?.operatingMargins as number | undefined) ?? null;
    const debtToEquity = (s.financialData?.debtToEquity as number | undefined) ?? null;
    const currentRatio = (s.financialData?.currentRatio as number | undefined) ?? null;
    const revenueGrowth = (s.financialData?.revenueGrowth as number | undefined) ?? null;
    const dividendYield = (s.summaryDetail?.dividendYield as number | undefined) ?? null;

    return {
      pe,
      pb,
      peg,
      roe,
      roa,
      profitMargins,
      operatingMargins,
      debtToEquity,
      currentRatio,
      revenueGrowth,
      dividendYield,
    };
  });
}

const MACRO_SYMBOLS: { ticker: string; label: string }[] = [
  { ticker: "DX-Y.NYB", label: "Dolar Endeksi (DXY)" },
  { ticker: "^TNX", label: "ABD 10Y Faiz" },
  { ticker: "USDTRY=X", label: "USD/TRY" },
];

export async function getMacro(): Promise<MacroPoint[]> {
  return cached("macro", async () => {
    try {
      const quotes = await yf.quote(MACRO_SYMBOLS.map((m) => m.ticker));
      return MACRO_SYMBOLS.map((m, i) => ({
        ticker: m.ticker,
        label: m.label,
        value: quotes[i]?.regularMarketPrice ?? null,
        changePercent: quotes[i]?.regularMarketChangePercent ?? null,
      }));
    } catch {
      return MACRO_SYMBOLS.map((m) => ({
        ticker: m.ticker,
        label: m.label,
        value: null,
        changePercent: null,
      }));
    }
  });
}

const OUNCE_TO_GRAM = 31.1035;

export async function getUsdTry(): Promise<number | null> {
  const macro = await getMacro();
  return macro.find((m) => m.ticker === "USDTRY=X")?.value ?? null;
}

export async function gramGoldTRY(xauUsd: number): Promise<number | null> {
  const usdTry = await getUsdTry();
  if (usdTry == null) return null;
  return (xauUsd * usdTry) / OUNCE_TO_GRAM;
}

import YahooFinance from "yahoo-finance2";
import type { Candle, Fundamentals, MacroPoint } from "./types";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  versionCheck: false,
});

const CACHE_TTL_MS = 120_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export interface CandleResult {
  ticker: string;
  name: string;
  currency: string;
  candles: Candle[];
  closes: number[];
}

export async function getCandles(ticker: string): Promise<CandleResult> {
  return cached(`candles:${ticker}`, async () => {
    const period1 = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    const res = await yf.chart(ticker, { period1, interval: "1d" });

    const candles: Candle[] = [];
    for (const q of res.quotes) {
      if (q.close == null || q.open == null || q.high == null || q.low == null) continue;
      candles.push({
        date: q.date.toISOString(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
      });
    }

    if (candles.length === 0) throw new Error(`${ticker} için fiyat verisi boş`);

    return {
      ticker,
      name: res.meta.longName || res.meta.shortName || ticker,
      currency: res.meta.currency,
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

    return {
      pe,
      pb: (s.defaultKeyStatistics?.priceToBook as number | undefined) ?? null,
      roe: (s.financialData?.returnOnEquity as number | undefined) ?? null,
      debtToEquity: (s.financialData?.debtToEquity as number | undefined) ?? null,
      revenueGrowth: (s.financialData?.revenueGrowth as number | undefined) ?? null,
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

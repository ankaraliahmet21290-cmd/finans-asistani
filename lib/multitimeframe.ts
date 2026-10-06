import YahooFinance from "yahoo-finance2";
import { computeIndicators } from "./indicators";
import { finalSignal, fundamentalScore, technicalScore } from "./scoring";
import { getFundamentals } from "./data";
import { BIST_30_TICKERS, findBistCompany } from "./bist";
import type { Candle, Signal } from "./types";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  versionCheck: false,
});

import { TIMEFRAMES, type CategoryTimeframeKey, type TimeframeConfig, type TimeframeKey } from "./timeframes";
export { TIMEFRAMES, type CategoryTimeframeKey, type TimeframeConfig, type TimeframeKey };
export interface TimeframeStockSignal {
  ticker: string;
  code: string;
  name: string;
  price: number;
  timeframe: TimeframeKey;
  timeframeLabel: string;
  // Hybrid
  score: number;
  signal: Signal;
  // Technical
  techScore: number;
  techSignal: Signal;
  // Fundamental
  fundScore: number | null;
  fundSignal: Signal | null;
  rsi: number | null;
  reasons: string[];
}

export interface CategorizedSignals {
  scannedAt: string;
  isWithinHours: boolean;
  categories: Record<
    CategoryTimeframeKey,
    { label: string; buys: TimeframeStockSignal[]; sells: TimeframeStockSignal[] }
  >;
  totalSignalsCount: number;
}

// Helper to aggregate 1h candles into 2h or 4h
function aggregateCandles(candles: Candle[], groupSize: number): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    for (const c of chunk) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    result.push({
      date: chunk[0].date,
      open,
      high,
      low,
      close,
    });
  }
  return result;
}

// In-memory cache for candles to minimize Yahoo calls
const tfCache = new Map<string, { at: number; data: Candle[] }>();
const TF_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function getTimeframeCandles(
  ticker: string,
  tf: TimeframeKey
): Promise<Candle[]> {
  const cacheKey = `${ticker}:${tf}`;
  const hit = tfCache.get(cacheKey);
  if (hit && Date.now() - hit.at < TF_CACHE_TTL) {
    return hit.data;
  }

  const cfg = TIMEFRAMES[tf];
  const period1 = new Date(Date.now() - cfg.historyDays * 24 * 3600 * 1000);

  let rawCandles: Candle[] = [];

  if (tf === "1h" || tf === "2h" || tf === "4h") {
    // Fetch 1h candles
    const h1Key = `${ticker}:1h_raw`;
    const h1Hit = tfCache.get(h1Key);
    if (h1Hit && Date.now() - h1Hit.at < TF_CACHE_TTL) {
      rawCandles = h1Hit.data;
    } else {
      const res = await yf.chart(ticker, { interval: "1h", period1 });
      const valid = res.quotes.filter(
        (q) => q.close != null && q.open != null && q.high != null && q.low != null
      );
      rawCandles = valid.map((q) => ({
        date: q.date.toISOString(),
        open: q.open as number,
        high: q.high as number,
        low: q.low as number,
        close: q.close as number,
      }));
      tfCache.set(h1Key, { at: Date.now(), data: rawCandles });
    }

    if (tf === "2h") {
      const agg = aggregateCandles(rawCandles, 2);
      tfCache.set(cacheKey, { at: Date.now(), data: agg });
      return agg;
    }

    if (tf === "4h") {
      const agg = aggregateCandles(rawCandles, 4);
      tfCache.set(cacheKey, { at: Date.now(), data: agg });
      return agg;
    }

    tfCache.set(cacheKey, { at: Date.now(), data: rawCandles });
    return rawCandles;
  }

  // Daily, Weekly, Monthly
  const interval = tf === "1wk" ? "1wk" : tf === "1mo" ? "1mo" : "1d";
  const res = await yf.chart(ticker, { interval, period1 });
  const valid = res.quotes.filter(
    (q) => q.close != null && q.open != null && q.high != null && q.low != null
  );
  rawCandles = valid.map((q) => ({
    date: q.date.toISOString(),
    open: q.open as number,
    high: q.high as number,
    low: q.low as number,
    close: q.close as number,
  }));

  tfCache.set(cacheKey, { at: Date.now(), data: rawCandles });
  return rawCandles;
}

export async function analyzeTimeframe(
  ticker: string,
  tf: TimeframeKey
): Promise<TimeframeStockSignal | null> {
  try {
    const candles = await getTimeframeCandles(ticker, tf);
    if (candles.length < 20) return null;

    const closes = candles.map((c) => c.close);
    const ind = computeIndicators(closes);
    const tech = technicalScore(closes, ind);

    const price = closes.at(-1) ?? 0;
    const bist = findBistCompany(ticker);
    const code = bist ? bist.code : ticker.replace(/\.IS$/, "");
    const name = bist ? bist.name : ticker;

    let fundScore: number | null = null;
    let fundSignal: Signal | null = null;

    try {
      const f = await getFundamentals(ticker);
      const fundRes = fundamentalScore(f);
      fundScore = fundRes.score;
      fundSignal = fundRes.signal;
    } catch {
      // ignore
    }

    const { score: hybridScore, signal: hybridSignal } = finalSignal(tech.score, fundScore);
    const lastRsi = ind.rsi.at(-1) != null ? Math.round(ind.rsi.at(-1)! * 10) / 10 : null;

    return {
      ticker,
      code,
      name,
      price,
      timeframe: tf,
      timeframeLabel: TIMEFRAMES[tf].label,
      score: hybridScore,
      signal: hybridSignal,
      techScore: tech.score,
      techSignal: tech.signal,
      fundScore,
      fundSignal,
      rsi: lastRsi,
      reasons: tech.reasons.slice(0, 3),
    };
  } catch (e) {
    console.error(`[multitimeframe] ${ticker} ${tf} error:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// Check trading hours: Monday to Friday, 09:50 - 18:00 (Turkey Time, UTC+3)
export function isWithinTradingHours(date = new Date()): boolean {
  const trDateStr = date.toLocaleString("en-US", { timeZone: "Europe/Istanbul", hour12: false });
  const trDate = new Date(trDateStr);
  const day = trDate.getDay(); // 0 Sunday, 6 Saturday
  if (day === 0 || day === 6) return false;

  const currentMinutes = trDate.getHours() * 60 + trDate.getMinutes();
  const startMinutes = 9 * 60 + 50; // 09:50
  const endMinutes = 18 * 60 + 0;   // 18:00

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Scan multi-timeframe signals across active universe
export async function scanCategorizedSignals(universe = BIST_30_TICKERS): Promise<CategorizedSignals> {
  const isHours = isWithinTradingHours();
  const timeframes: CategoryTimeframeKey[] = ["1h", "2h", "4h", "1wk", "1mo"];

  const categories: CategorizedSignals["categories"] = {
    "1h": { label: "1 Saatlik Sinyaller", buys: [], sells: [] },
    "2h": { label: "2 Saatlik Sinyaller", buys: [], sells: [] },
    "4h": { label: "4 Saatlik Sinyaller", buys: [], sells: [] },
    "1wk": { label: "Haftalık Sinyaller", buys: [], sells: [] },
    "1mo": { label: "Aylık Sinyaller", buys: [], sells: [] },
  };

  let totalSignalsCount = 0;

  for (const tf of timeframes) {
    const results = await Promise.all(universe.map((t) => analyzeTimeframe(t, tf)));
    for (const r of results) {
      if (!r) continue;
      if (r.signal === "AL") {
        categories[tf].buys.push(r);
        totalSignalsCount++;
      } else if (r.signal === "SAT") {
        categories[tf].sells.push(r);
        totalSignalsCount++;
      }
    }

    // Sort buys descending, sells ascending
    categories[tf].buys.sort((a: TimeframeStockSignal, b: TimeframeStockSignal) => b.score - a.score);
    categories[tf].sells.sort((a: TimeframeStockSignal, b: TimeframeStockSignal) => a.score - b.score);
  }

  return {
    scannedAt: new Date().toISOString(),
    isWithinHours: isHours,
    categories,
    totalSignalsCount,
  };
}

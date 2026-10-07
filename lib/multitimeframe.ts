import { computeIndicators } from "./indicators";
import { finalSignal, fundamentalScore, technicalScore } from "./scoring";
import { getCandles, getFundamentals } from "./data";
import { BIST_30_TICKERS, findBistCompany, isFinancialOrBank } from "./bist";
import type { Candle, Signal } from "./types";

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

export interface TimeframeCategoryData {
  label: string;
  buys: TimeframeStockSignal[];
  sells: TimeframeStockSignal[];
  items: TimeframeStockSignal[];
}

export interface CategorizedSignals {
  scannedAt: string;
  isWithinHours: boolean;
  categories: Record<CategoryTimeframeKey, TimeframeCategoryData>;
  totalSignalsCount: number;
}

let cachedScanData: CategorizedSignals | null = null;
let lastScanTimestamp = 0;
const SCAN_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function getCachedScan(): CategorizedSignals | null {
  if (cachedScanData && Date.now() - lastScanTimestamp < SCAN_CACHE_TTL_MS) {
    return cachedScanData;
  }
  return null;
}

export function setCachedScan(data: CategorizedSignals): void {
  cachedScanData = data;
  lastScanTimestamp = Date.now();
}

export async function getTimeframeCandles(
  ticker: string,
  tf: TimeframeKey
): Promise<Candle[]> {
  const res = await getCandles(ticker, tf);
  return res.candles;
}

export async function analyzeTimeframe(
  ticker: string,
  tf: TimeframeKey,
  preloadedFund?: { score: number | null; signal: Signal | null }
): Promise<TimeframeStockSignal | null> {
  try {
    const candles = await getTimeframeCandles(ticker, tf);
    if (candles.length < 20) return null;

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume ?? 0);
    const ind = computeIndicators(closes, highs, lows, volumes);
    const tech = technicalScore(closes, ind, candles);

    const price = closes.at(-1) ?? 0;
    const bist = findBistCompany(ticker);
    const code = bist ? bist.code : ticker.replace(/\.IS$/, "");
    const name = bist ? bist.name : ticker;

    let fundScore: number | null = null;
    let fundSignal: Signal | null = null;

    if (preloadedFund !== undefined) {
      fundScore = preloadedFund.score;
      fundSignal = preloadedFund.signal;
    } else {
      try {
        const f = await getFundamentals(ticker);
        const isBank = isFinancialOrBank(ticker);
        const fundRes = fundamentalScore(f, isBank);
        fundScore = fundRes.score;
        fundSignal = fundRes.signal;
      } catch {
        // ignore
      }
    }

    const { score: hybridScore, signal: hybridSignal } = finalSignal(tech.score, fundScore, tf);
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
  const timeframes: CategoryTimeframeKey[] = [
    "5m",
    "10m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "1d",
    "1wk",
    "1mo",
  ];

  const categories: CategorizedSignals["categories"] = {
    "5m": { label: "5 Dakikalık Sinyaller", buys: [], sells: [], items: [] },
    "10m": { label: "10 Dakikalık Sinyaller", buys: [], sells: [], items: [] },
    "15m": { label: "15 Dakikalık Sinyaller", buys: [], sells: [], items: [] },
    "30m": { label: "30 Dakikalık Sinyaller", buys: [], sells: [], items: [] },
    "1h": { label: "1 Saatlik Sinyaller", buys: [], sells: [], items: [] },
    "2h": { label: "2 Saatlik Sinyaller", buys: [], sells: [], items: [] },
    "4h": { label: "4 Saatlik Sinyaller", buys: [], sells: [], items: [] },
    "1d": { label: "Günlük Sinyaller", buys: [], sells: [], items: [] },
    "1wk": { label: "Haftalık Sinyaller", buys: [], sells: [], items: [] },
    "1mo": { label: "Aylık Sinyaller", buys: [], sells: [], items: [] },
  };

  // 1. Preload fundamentals ONCE per ticker (drops 300 calls down to 30 calls)
  const fundMap = new Map<string, { score: number | null; signal: Signal | null }>();
  await Promise.all(
    universe.map(async (ticker) => {
      try {
        const f = await getFundamentals(ticker);
        const isBank = isFinancialOrBank(ticker);
        const fundRes = fundamentalScore(f, isBank);
        fundMap.set(ticker, { score: fundRes.score, signal: fundRes.signal });
      } catch {
        fundMap.set(ticker, { score: null, signal: null });
      }
    })
  );

  // 2. Scan all timeframes in parallel
  await Promise.all(
    timeframes.map(async (tf) => {
      const results = await Promise.all(
        universe.map((t) => analyzeTimeframe(t, tf, fundMap.get(t)))
      );
      for (const r of results) {
        if (!r) continue;
        categories[tf].items.push(r);
        if (r.signal === "AL") {
          categories[tf].buys.push(r);
        } else if (r.signal === "SAT") {
          categories[tf].sells.push(r);
        }
      }

      // Sort buys descending, sells ascending
      categories[tf].buys.sort((a, b) => b.score - a.score);
      categories[tf].sells.sort((a, b) => a.score - b.score);
    })
  );

  let totalSignalsCount = 0;
  for (const tf of timeframes) {
    totalSignalsCount += categories[tf].buys.length + categories[tf].sells.length;
  }

  const result: CategorizedSignals = {
    scannedAt: new Date().toISOString(),
    isWithinHours: isHours,
    categories,
    totalSignalsCount,
  };

  // Update in-memory cache
  setCachedScan(result);

  return result;
}

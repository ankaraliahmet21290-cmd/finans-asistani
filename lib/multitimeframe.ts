import { computeIndicators } from "./indicators";
import { finalSignal, fundamentalScore, technicalScore } from "./scoring";
import { getCandles, getFundamentals, resolveTickerSymbol } from "./data";
import { findBistCompany, isFinancialOrBank } from "./bist";
import { mapWithLimit } from "./concurrency";
import { getIndexTickers, getIndexTypeSettingsFromFile } from "./index-type-storage";
import type { IndexTypeKey } from "./index-types";
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

import { MARKETS, CURATED_MARKET_ITEMS, getMarketSessionStatus } from "./markets";

export interface CategorizedSignals {
  scannedAt: string;
  isWithinHours: boolean;
  categories: Record<CategoryTimeframeKey, TimeframeCategoryData>;
  totalSignalsCount: number;
  indexType?: IndexTypeKey;
  market?: string;
  totalScanned?: number;
}

import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export async function readDiskCache(key: string = "default"): Promise<CategorizedSignals | null> {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(CACHE_DIR, `signals-${safeKey}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as CategorizedSignals;
  } catch {
    return null;
  }
}

export async function writeDiskCache(key: string, data: CategorizedSignals): Promise<void> {
  try {
    await ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(CACHE_DIR, `signals-${safeKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("[multitimeframe] writeDiskCache hatası:", err);
  }
}

const cachedScans = new Map<string, { at: number; data: CategorizedSignals }>();
const ongoingScans = new Map<string, Promise<CategorizedSignals>>();
const SCAN_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SCAN_CONCURRENCY = 4;

export function getCachedScan(key: string = "default"): CategorizedSignals | null {
  const item = cachedScans.get(key);
  if (item && Date.now() - item.at < SCAN_CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

export async function getCachedScanAsync(key: string = "default"): Promise<CategorizedSignals | null> {
  const item = cachedScans.get(key);
  if (item && Date.now() - item.at < SCAN_CACHE_TTL_MS) {
    return item.data;
  }

  // Bellekte yoksa diskten yükle
  const diskData = await readDiskCache(key);
  if (diskData) {
    cachedScans.set(key, { at: Date.now(), data: diskData });
    return diskData;
  }
  return null;
}

export function setCachedScan(data: CategorizedSignals, customKey?: string): void {
  const key = customKey || data.market || data.indexType || "default";
  cachedScans.set(key, { at: Date.now(), data });
  void writeDiskCache(key, data);
}

export async function getTimeframeCandles(
  rawTicker: string,
  tf: TimeframeKey,
  preferDirect?: boolean
): Promise<Candle[]> {
  const ticker = resolveTickerSymbol(rawTicker);
  const res = await getCandles(ticker, tf, { preferDirect });
  return res.candles;
}

export async function analyzeTimeframe(
  rawTicker: string,
  tf: TimeframeKey,
  preloadedFund?: { score: number | null; signal: Signal | null },
  preferDirect?: boolean
): Promise<TimeframeStockSignal | null> {
  const ticker = resolveTickerSymbol(rawTicker);
  try {
    const candles = await getTimeframeCandles(ticker, tf, preferDirect);
    if (candles.length < 20) return null;

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume ?? 0);
    const ind = computeIndicators(closes, highs, lows, volumes);
    const tech = technicalScore(closes, ind, candles);

    const price = closes.at(-1) ?? 0;
    const bist = findBistCompany(ticker);
    const curated = CURATED_MARKET_ITEMS[ticker];
    const code = bist
      ? bist.code
      : curated
      ? curated.ticker.replace("-USD", "").replace("=F", "").replace("=X", "").replace("^", "")
      : ticker.replace(/\.IS$/, "");
    const name = bist ? bist.name : curated ? curated.name : ticker;

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

// Scan multi-timeframe signals across BIST indices or other markets (crypto, us_stocks, commodity_forex)
export async function scanCategorizedSignals(
  target?: string,
  forceRefresh = false
): Promise<CategorizedSignals> {
  const isMarket = target === "crypto" || target === "us_stocks" || target === "commodity_forex";
  let activeIndexType: IndexTypeKey | undefined = undefined;
  if (!isMarket) {
    activeIndexType = (target as IndexTypeKey) ?? (await getIndexTypeSettingsFromFile()).multiTimeframe;
  }
  const key = target || activeIndexType || "default";

  if (!forceRefresh) {
    const cached = await getCachedScan(key);
    if (cached) return cached;
  }

  // Devam eden bir tarama varsa yeni bir tarama başlatma, var olanı bekle (Deduplication)
  const existing = ongoingScans.get(key);
  if (existing) {
    return await existing;
  }

  const runScan = async (): Promise<CategorizedSignals> => {
    let universe: readonly string[] = [];
    let isHours = false;

    if (target === "crypto") {
      universe = MARKETS.find((m) => m.id === "crypto")?.featuredTickers ?? [];
      isHours = true;
    } else if (target === "us_stocks") {
      universe = MARKETS.find((m) => m.id === "us_stocks")?.featuredTickers ?? [];
      isHours = getMarketSessionStatus("us_stocks").isOpen;
    } else if (target === "commodity_forex") {
      universe = MARKETS.find((m) => m.id === "commodity_forex")?.featuredTickers ?? [];
      isHours = getMarketSessionStatus("commodity_forex").isOpen;
    } else {
      universe = getIndexTickers(activeIndexType || "bist30");
      isHours = isWithinTradingHours();
    }

    const preferDirect = false;
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

    // 1. Preload fundamentals ONCE per ticker (1 saatlik cache ile korunur)
    const fundMap = new Map<string, { score: number | null; signal: Signal | null }>();
    await mapWithLimit(universe, SCAN_CONCURRENCY, async (ticker) => {
      try {
        const f = await getFundamentals(ticker);
        const isBank = isFinancialOrBank(ticker);
        const fundRes = fundamentalScore(f, isBank);
        fundMap.set(ticker, { score: fundRes.score, signal: fundRes.signal });
      } catch {
        fundMap.set(ticker, { score: null, signal: null });
      }
    });

    // 2. Scan each ticker for all timeframes with bounded concurrency
    await mapWithLimit(universe, SCAN_CONCURRENCY, async (ticker) => {
      const fund = fundMap.get(ticker);
      for (const tf of timeframes) {
        const r = await analyzeTimeframe(ticker, tf, fund, preferDirect);
        if (!r) continue;
        const cat = categories[r.timeframe as CategoryTimeframeKey];
        if (!cat) continue;
        cat.items.push(r);
        if (r.signal === "AL") {
          cat.buys.push(r);
        } else if (r.signal === "SAT") {
          cat.sells.push(r);
        }
      }
    });

    // Sort buys descending, sells ascending
    for (const tf of timeframes) {
      categories[tf].buys.sort((a, b) => b.score - a.score);
      categories[tf].sells.sort((a, b) => a.score - b.score);
    }

    let totalSignalsCount = 0;
    for (const tf of timeframes) {
      totalSignalsCount += categories[tf].buys.length + categories[tf].sells.length;
    }

    const result: CategorizedSignals = {
      scannedAt: new Date().toISOString(),
      isWithinHours: isHours,
      categories,
      totalSignalsCount,
      indexType: activeIndexType,
      market: isMarket ? target : undefined,
      totalScanned: universe.length,
    };

    // Update in-memory & disk cache
    setCachedScan(result, key);

    return result;
  };

  const p = runScan().finally(() => {
    ongoingScans.delete(key);
  });

  ongoingScans.set(key, p);
  return await p;
}

import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { findBistCompany } from "@/lib/bist";
import { mapWithLimit } from "@/lib/concurrency";
import { getIndexTickers, getIndexTypeSettingsFromFile } from "@/lib/index-type-storage";
import type { IndexTypeKey } from "@/lib/index-types";
import { getActiveRefreshConfig } from "@/lib/refresh-settings-storage";
import {
  getActiveTimeframeSettings,
  normalizeTimeframeKey,
} from "@/lib/timeframe-settings-storage";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";
import type { Signal } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface RankedStock {
  ticker: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  score: number;
  signal: Signal;
  techScore: number;
  fundScore: number | null;
  reasons: string[];
}

export interface TopSignalsResponse {
  buys: RankedStock[];
  sells: RankedStock[];
  timeframe: TimeframeKey;
  timeframeLabel: string;
  updatedAt: string;
  totalEvaluated: number;
  indexType: IndexTypeKey;
}

// In-memory cache by index type + timeframe
interface CacheEntry {
  data: TopSignalsResponse;
  lastFetchedAt: number;
}
const cacheByTimeframe = new Map<string, CacheEntry>();
const inFlightPromises = new Map<string, Promise<TopSignalsResponse>>();

async function computeTopSignals(
  timeframe: TimeframeKey = "1d",
  indexType: IndexTypeKey = "bist30"
): Promise<TopSignalsResponse> {
  const tickers = getIndexTickers(indexType);
  const evaluated = await mapWithLimit(tickers, 16, async (ticker): Promise<RankedStock | null> => {
    try {
      const res = await analyzeSymbol(ticker, "stock", timeframe);
      const bist = findBistCompany(ticker);
      const code = bist ? bist.code : ticker.replace(/\.IS$/, "");
      const name = bist ? bist.name : res.name;

      const techReasons = res.tech.items
        .filter((i) => i.point !== 0)
        .map((i) => i.detail);
      const fundReasons =
        res.fund?.metrics
          .filter((m) => m.point !== 0)
          .map((m) => m.detail) ?? [];

      return {
        ticker,
        code,
        name,
        price: res.price,
        currency: res.currency,
        change: res.change,
        changePercent: res.changePercent,
        score: res.score,
        signal: res.signal,
        techScore: res.tech.score,
        fundScore: res.fund?.score ?? null,
        reasons: [...techReasons, ...fundReasons].slice(0, 3),
      };
    } catch {
      return null;
    }
  });

  const stocks: RankedStock[] = evaluated.filter((s): s is RankedStock => s !== null);

  // AL Puanı En Yüksek (Highest positive score, descending)
  const buys = [...stocks]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // SAT Puanı En Yüksek (Highest sell signal / lowest negative score, ascending)
  const sells = [...stocks]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const tfConfig = TIMEFRAMES[timeframe] ?? TIMEFRAMES["1d"];

  return {
    buys,
    sells,
    timeframe,
    timeframeLabel: tfConfig.label,
    updatedAt: new Date().toISOString(),
    totalEvaluated: stocks.length,
    indexType,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";
  const rawTf = searchParams.get("timeframe") || searchParams.get("tf");
  const fallbackTf = getActiveTimeframeSettings().topSignals;
  const timeframe: TimeframeKey = rawTf ? normalizeTimeframeKey(rawTf) : fallbackTf;
  const { topSignals: indexType } = await getIndexTypeSettingsFromFile();
  const cacheKey = `${indexType}:${timeframe}`;

  const now = Date.now();
  const ttl = getActiveRefreshConfig().cacheTtlMs;
  const cached = cacheByTimeframe.get(cacheKey);

  if (!force && cached && now - cached.lastFetchedAt < ttl) {
    return NextResponse.json(cached.data);
  }

  const existingInFlight = inFlightPromises.get(cacheKey);
  if (existingInFlight) {
    const data = await existingInFlight;
    return NextResponse.json(data);
  }

  const promise = (async () => {
    try {
      const data = await computeTopSignals(timeframe, indexType);
      cacheByTimeframe.set(cacheKey, { data, lastFetchedAt: Date.now() });
      return data;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  const data = await promise;
  return NextResponse.json(data);
}

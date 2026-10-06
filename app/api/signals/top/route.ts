import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { BIST_30_TICKERS, findBistCompany } from "@/lib/bist";
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
}

// In-memory cache by timeframe
interface CacheEntry {
  data: TopSignalsResponse;
  lastFetchedAt: number;
}
const cacheByTimeframe = new Map<TimeframeKey, CacheEntry>();
const inFlightPromises = new Map<TimeframeKey, Promise<TopSignalsResponse>>();

async function computeTopSignals(timeframe: TimeframeKey = "1d"): Promise<TopSignalsResponse> {
  const evaluated = await Promise.allSettled(
    BIST_30_TICKERS.map(async (ticker): Promise<RankedStock> => {
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
    })
  );

  const stocks: RankedStock[] = [];
  for (const item of evaluated) {
    if (item.status === "fulfilled" && item.value) {
      stocks.push(item.value);
    }
  }

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
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";
  const rawTf = searchParams.get("timeframe") || searchParams.get("tf");
  const fallbackTf = getActiveTimeframeSettings().topSignals;
  const timeframe: TimeframeKey = rawTf ? normalizeTimeframeKey(rawTf) : fallbackTf;

  const now = Date.now();
  const ttl = getActiveRefreshConfig().cacheTtlMs;
  const cached = cacheByTimeframe.get(timeframe);

  if (!force && cached && now - cached.lastFetchedAt < ttl) {
    return NextResponse.json(cached.data);
  }

  const existingInFlight = inFlightPromises.get(timeframe);
  if (existingInFlight) {
    const data = await existingInFlight;
    return NextResponse.json(data);
  }

  const promise = (async () => {
    try {
      const data = await computeTopSignals(timeframe);
      cacheByTimeframe.set(timeframe, { data, lastFetchedAt: Date.now() });
      return data;
    } finally {
      inFlightPromises.delete(timeframe);
    }
  })();

  inFlightPromises.set(timeframe, promise);
  const data = await promise;
  return NextResponse.json(data);
}

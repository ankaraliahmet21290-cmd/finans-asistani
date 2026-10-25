import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { findBistCompany } from "@/lib/bist";
import { mapWithLimit } from "@/lib/concurrency";
import { getIndexTickers, getIndexTypeSettingsFromFile } from "@/lib/index-type-storage";
import { normalizeIndexTypeKey, type IndexTypeKey } from "@/lib/index-types";
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

import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

async function readTopSignalsDiskCache(key: string): Promise<TopSignalsResponse | null> {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(CACHE_DIR, `top-signals-${safeKey}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as TopSignalsResponse;
  } catch {
    return null;
  }
}

async function writeTopSignalsDiskCache(key: string, data: TopSignalsResponse): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(CACHE_DIR, `top-signals-${safeKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
  } catch {
    // ignore
  }
}

// In-memory cache by index type + timeframe
interface CacheEntry {
  data: TopSignalsResponse;
  lastFetchedAt: number;
}
const cacheByTimeframe = new Map<string, CacheEntry>();
const inFlightPromises = new Map<string, Promise<TopSignalsResponse>>();

import {
  readDiskCache,
  type TimeframeStockSignal,
  type TimeframeCategoryData,
} from "@/lib/multitimeframe";

async function computeTopSignals(
  timeframe: TimeframeKey = "1d",
  indexType: IndexTypeKey = "bist30"
): Promise<TopSignalsResponse> {
  let tickers = [...getIndexTickers(indexType)];
  // bistall (560+ hisse) canlı istekte zaman aşımına yol açabileceğinden ilk 100 hisse ile sınırla
  if (indexType === "bistall" && tickers.length > 100) {
    tickers = tickers.slice(0, 100);
  }

  // 3 temel periyottan zaman hizalı türetme modu (hızlı ve rate-limit korumalı)
  const preferDirect = false;
  const evaluated = await mapWithLimit(tickers, 16, async (ticker): Promise<RankedStock | null> => {
    try {
      const res = await analyzeSymbol(ticker, "stock", timeframe, { preferDirect });
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
  const tfConfig = TIMEFRAMES[timeframe] ?? TIMEFRAMES["1d"];

  // Canlı analiz boş döndüyse (rate-limit, timeout vb.), multitimeframe disk önbelleğinden beslen
  if (stocks.length === 0) {
    const fallback = (await readDiskCache(indexType)) ?? (await readDiskCache("bist30"));
    if (fallback?.categories) {
      const cat: TimeframeCategoryData | undefined =
        (fallback.categories as Record<string, TimeframeCategoryData>)[timeframe] ??
        fallback.categories["1d"];
      if (cat) {
        const toRanked = (item: TimeframeStockSignal): RankedStock => ({
          ticker: item.ticker,
          code: item.code,
          name: item.name,
          price: item.price ?? 0,
          currency: "TRY",
          change: 0,
          changePercent: 0,
          score: item.score ?? 0,
          signal: item.signal ?? "TUT",
          techScore: item.techScore ?? 0,
          fundScore: item.fundScore ?? null,
          reasons: item.reasons ?? [],
        });

        return {
          buys: (cat.buys ?? []).slice(0, 5).map(toRanked),
          sells: (cat.sells ?? []).slice(0, 5).map(toRanked),
          timeframe,
          timeframeLabel: tfConfig.label,
          updatedAt: fallback.scannedAt ?? new Date().toISOString(),
          totalEvaluated: fallback.totalScanned ?? 0,
          indexType,
        };
      }
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
  const rawIndex = searchParams.get("indexType") || searchParams.get("index");
  const { topSignals: fileIndexType } = await getIndexTypeSettingsFromFile();
  const indexType: IndexTypeKey = rawIndex ? normalizeIndexTypeKey(rawIndex) : fileIndexType;
  const cacheKey = `${indexType}:${timeframe}`;

  const now = Date.now();
  const ttl = getActiveRefreshConfig().cacheTtlMs;
  const cached = cacheByTimeframe.get(cacheKey);

  if (!force) {
    if (cached && now - cached.lastFetchedAt < ttl) {
      return NextResponse.json(cached.data);
    }
    if (!cached) {
      const diskData = await readTopSignalsDiskCache(cacheKey);
      if (diskData) {
        cacheByTimeframe.set(cacheKey, { data: diskData, lastFetchedAt: Date.now() });
        return NextResponse.json(diskData);
      }
    }
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
      void writeTopSignalsDiskCache(cacheKey, data);
      return data;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  const data = await promise;
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { BIST_30_TICKERS, findBistCompany } from "@/lib/bist";
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
  updatedAt: string;
  totalEvaluated: number;
}

// In-memory cache for top signals: 5 minutes TTL
let cachedData: TopSignalsResponse | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;
let fetchPromise: Promise<TopSignalsResponse> | null = null;

async function computeTopSignals(): Promise<TopSignalsResponse> {
  const evaluated = await Promise.allSettled(
    BIST_30_TICKERS.map(async (ticker): Promise<RankedStock> => {
      const res = await analyzeSymbol(ticker, "stock");
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

  return {
    buys,
    sells,
    updatedAt: new Date().toISOString(),
    totalEvaluated: stocks.length,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";
  const now = Date.now();

  if (!force && cachedData && now - lastFetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedData);
  }

  if (fetchPromise) {
    const data = await fetchPromise;
    return NextResponse.json(data);
  }

  fetchPromise = (async () => {
    try {
      const data = await computeTopSignals();
      cachedData = data;
      lastFetchedAt = Date.now();
      return data;
    } finally {
      fetchPromise = null;
    }
  })();

  const data = await fetchPromise;
  return NextResponse.json(data);
}

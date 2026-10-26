import { NextResponse } from "next/server";
import { MARKETS, CURATED_MARKET_ITEMS, detectAssetCategory, getMarketSessionStatus } from "@/lib/markets";
import { getBatchQuotes, getUsdTry } from "@/lib/data";
import { analyzeSymbol } from "@/lib/analyze";
import { mapWithLimit } from "@/lib/concurrency";
import { findCryptoAsset } from "@/lib/crypto-assets";
import { findUsStockAsset } from "@/lib/us-stock-assets";
import type { TimeframeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SummaryCacheEntry {
  at: number;
  data: unknown;
}

const summaryCache = new Map<string, SummaryCacheEntry>();
const summaryInFlight = new Map<string, Promise<unknown>>();
const SUMMARY_CACHE_TTL_MS = 60 * 1000; // 60 saniye önbellek

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("market") as "bist" | "commodity_forex" | "crypto" | "us_stocks" | null;
    const tf = (searchParams.get("timeframe") as TimeframeKey) || "1d";

    const selectedMarket = MARKETS.find((m) => m.id === marketId) ?? MARKETS[1]; // default commodity_forex if not specified
    const cacheKey = `${selectedMarket.id}:${tf}`;

    const hit = summaryCache.get(cacheKey);
    if (hit && Date.now() - hit.at < SUMMARY_CACHE_TTL_MS) {
      return NextResponse.json(hit.data);
    }

    const inFlight = summaryInFlight.get(cacheKey);
    if (inFlight) {
      const data = await inFlight;
      return NextResponse.json(data);
    }

    const computePromise = (async () => {
      const tickers = [...selectedMarket.featuredTickers];

      // 1. Fetch live quotes in batch (extremely fast)
      const batch = await getBatchQuotes(tickers);
      const session = getMarketSessionStatus(selectedMarket.id);
      const usdTry = await getUsdTry();

      // 2. Compute lightweight signals for each featured ticker with controlled concurrency
      const concurrency = selectedMarket.id === "us_stocks" ? 10 : 8;
      const items = await mapWithLimit(tickers, concurrency, async (ticker) => {
        const curated = CURATED_MARKET_ITEMS[ticker];
        const category = detectAssetCategory(ticker);
        const quote = batch[ticker];
        const cryptoAsset = findCryptoAsset(ticker);
        const usStockAsset = findUsStockAsset(ticker);

        try {
          // Analyze symbol with cached candle engine
          const analysis = await analyzeSymbol(ticker, category, tf);
          return {
            ticker,
            code: cryptoAsset?.code ?? usStockAsset?.code ?? ticker.replace(".IS", "").replace("-USD", ""),
            name: curated?.name || cryptoAsset?.name || usStockAsset?.name || analysis.name,
            icon: curated?.icon || cryptoAsset?.icon || usStockAsset?.icon,
            category: curated?.category || category,
            subCategory: cryptoAsset?.subCategory || usStockAsset?.subCategory,
            exchange: usStockAsset?.exchange,
            currency: curated?.currency || analysis.currency,
            unit: curated?.unit,
            price: analysis.price || quote?.price || 0,
            change: analysis.change || quote?.change || 0,
            changePercent: analysis.changePercent || quote?.changePercent || 0,
            signal: analysis.signal,
            score: analysis.score,
            techScore: analysis.tech.score,
            fundScore: analysis.fund?.score ?? null,
            timeframe: tf,
            // Asset-specific highlights
            pivots: analysis.forexCommodityMetrics?.pivotPoints,
            dxy: analysis.forexCommodityMetrics?.dxyValue,
            goldSilverRatio: analysis.forexCommodityMetrics?.goldSilverRatio,
            gramGoldTRY: analysis.gramGoldTRY,
            crypto: analysis.cryptoFundamentals,
            usStock: analysis.usStockFundamentals,
            indicators: {
              rsi: analysis.ind.rsi.at(-1) ?? null,
              sma50: analysis.ind.sma50.at(-1) ?? null,
              sma200: analysis.ind.sma200.at(-1) ?? null,
              bbUpper: analysis.ind.bb.at(-1)?.upper ?? null,
              bbLower: analysis.ind.bb.at(-1)?.lower ?? null,
            },
            reasons: analysis.tech.reasons.slice(0, 3),
          };
        } catch (e) {
          console.warn(`[market-summary] Failed to analyze ${ticker}:`, e);
          return {
            ticker,
            code: cryptoAsset?.code ?? usStockAsset?.code ?? ticker.replace(".IS", "").replace("-USD", ""),
            name: curated?.name || cryptoAsset?.name || usStockAsset?.name || ticker,
            icon: curated?.icon || cryptoAsset?.icon || usStockAsset?.icon,
            category: curated?.category || category,
            subCategory: cryptoAsset?.subCategory || usStockAsset?.subCategory,
            exchange: usStockAsset?.exchange,
            currency: curated?.currency || "USD",
            unit: curated?.unit,
            price: quote?.price || 0,
            change: quote?.change || 0,
            changePercent: quote?.changePercent || 0,
            signal: "TUT" as const,
            score: 0,
            techScore: 0,
            fundScore: null,
            timeframe: tf,
            indicators: {
              rsi: null,
              sma50: null,
              sma200: null,
              bbUpper: null,
              bbLower: null,
            },
            reasons: ["Veri hesaplanamadı"],
          };
        }
      });

      const payload = {
        market: selectedMarket,
        session,
        usdTry,
        items,
        updatedAt: new Date().toISOString(),
      };

      summaryCache.set(cacheKey, { at: Date.now(), data: payload });
      return payload;
    })();

    summaryInFlight.set(cacheKey, computePromise);
    try {
      const payload = await computePromise;
      return NextResponse.json(payload);
    } finally {
      summaryInFlight.delete(cacheKey);
    }
  } catch (error) {
    console.error("[market-summary] API Error:", error);
    return NextResponse.json(
      { error: "Piyasa verileri alınamadı", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

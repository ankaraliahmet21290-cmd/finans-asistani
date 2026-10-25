import { computeIndicators } from "./indicators";
import {
  getCandles,
  getCryptoFundamentals,
  getForexCommodityMetrics,
  getFundamentals,
  getMacro,
  getUsStockFundamentals,
  gramGoldTRY,
} from "./data";
import { finalSignal, fundamentalScore, getHybridAssessment, technicalScore } from "./scoring";
import { findBistCompany, isFinancialOrBank } from "./bist";
import { CURATED_MARKET_ITEMS } from "./markets";
import type {
  AnalysisResult,
  AssetType,
  CryptoFundamentals,
  ForexCommodityMetrics,
  FundamentalResult,
  Fundamentals,
  TimeframeKey,
  UsStockFundamentals,
} from "./types";

export interface AnalyzeSymbolOptions {
  preferDirect?: boolean;
}

export async function analyzeSymbol(
  ticker: string,
  type: AssetType,
  timeframe: TimeframeKey = "1d",
  options?: AnalyzeSymbolOptions
): Promise<AnalysisResult> {
  const candleResult = await getCandles(ticker, timeframe, { preferDirect: options?.preferDirect });
  const { name: rawName, currency, candles, closes } = candleResult;
  const bist = findBistCompany(ticker);
  const curated = CURATED_MARKET_ITEMS[ticker.toUpperCase()];
  const name = bist ? bist.name : curated?.name || rawName;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume ?? 0);
  const ind = computeIndicators(closes, highs, lows, volumes);
  const tech = technicalScore(closes, ind, candles);

  let fundamentals: Fundamentals | null = null;
  let fund: FundamentalResult | null = null;
  let cryptoFundamentals: CryptoFundamentals | null = null;
  let forexCommodityMetrics: ForexCommodityMetrics | null = null;
  let usStockFundamentals: UsStockFundamentals | null = null;

  const price = candleResult.regularMarketPrice ?? closes.at(-1) ?? 0;
  const prevClose = closes.length >= 2 ? closes.at(-2)! : price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  if (type === "stock" || type === "us_stock") {
    fundamentals = await getFundamentals(ticker);
    const isBank = isFinancialOrBank(ticker);
    fund = fundamentalScore(fundamentals, isBank);

    if (type === "us_stock") {
      usStockFundamentals = await getUsStockFundamentals(ticker, price);
    }
  } else if (type === "crypto") {
    cryptoFundamentals = await getCryptoFundamentals(ticker);
  } else if (type === "forex" || type === "commodity" || type === "gold") {
    forexCommodityMetrics = await getForexCommodityMetrics(ticker, candles);
  }

  const { score, signal } = finalSignal(tech.score, fund?.score ?? null, timeframe);
  const hybridAssessment = getHybridAssessment(
    tech.signal,
    fund?.signal ?? null,
    tech.score,
    fund?.score ?? null,
    timeframe
  );

  const result: AnalysisResult = {
    ticker,
    type,
    name,
    currency,
    timeframe,
    price,
    change,
    changePercent,
    candles,
    ind,
    tech,
    fund,
    fundamentals,
    cryptoFundamentals,
    forexCommodityMetrics,
    usStockFundamentals,
    score,
    signal,
    hybridAssessment,
    updatedAt: new Date().toISOString(),
  };

  if (type === "gold" || ticker.toUpperCase() === "GC=F") {
    result.macro = await getMacro();
    const gram = await gramGoldTRY(price);
    if (gram != null) result.gramGoldTRY = gram;
  }

  return result;
}

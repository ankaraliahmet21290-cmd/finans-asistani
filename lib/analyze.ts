import { computeIndicators } from "./indicators";
import { getCandles, getFundamentals, getMacro, gramGoldTRY } from "./data";
import { finalSignal, fundamentalScore, getHybridAssessment, technicalScore } from "./scoring";
import { findBistCompany } from "./bist";
import type { AnalysisResult, AssetType, FundamentalResult, Fundamentals, TimeframeKey } from "./types";

export async function analyzeSymbol(
  ticker: string,
  type: AssetType,
  timeframe: TimeframeKey = "1d"
): Promise<AnalysisResult> {
  const candleResult = await getCandles(ticker, timeframe);
  const { name: rawName, currency, candles, closes } = candleResult;
  const bist = findBistCompany(ticker);
  const name = bist ? bist.name : rawName;
  const ind = computeIndicators(closes);
  const tech = technicalScore(closes, ind);

  let fundamentals: Fundamentals | null = null;
  let fund: FundamentalResult | null = null;

  if (type === "stock") {
    fundamentals = await getFundamentals(ticker);
    fund = fundamentalScore(fundamentals);
  }

  const { score, signal } = finalSignal(tech.score, fund?.score ?? null);
  const hybridAssessment = getHybridAssessment(
    tech.signal,
    fund?.signal ?? null,
    tech.score,
    fund?.score ?? null
  );

  const price = candleResult.regularMarketPrice ?? closes.at(-1) ?? 0;
  const prevClose = candleResult.previousClose ?? closes.at(-2) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

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
    score,
    signal,
    hybridAssessment,
    updatedAt: new Date().toISOString(),
  };

  if (type === "gold") {
    result.macro = await getMacro();
    const gram = await gramGoldTRY(price);
    if (gram != null) result.gramGoldTRY = gram;
  }

  return result;
}

import { computeIndicators } from "./indicators";
import { getCandles, getFundamentals, getMacro, gramGoldTRY } from "./data";
import { finalSignal, fundamentalScore, technicalScore } from "./scoring";
import type { AnalysisResult, AssetType, FundamentalResult, Fundamentals } from "./types";

export async function analyzeSymbol(
  ticker: string,
  type: AssetType
): Promise<AnalysisResult> {
  const { name, currency, candles, closes } = await getCandles(ticker);
  const ind = computeIndicators(closes);
  const tech = technicalScore(closes, ind);

  let fundamentals: Fundamentals | null = null;
  let fund: FundamentalResult | null = null;

  if (type === "stock") {
    fundamentals = await getFundamentals(ticker);
    fund = fundamentalScore(fundamentals);
  }

  const { score, signal } = finalSignal(tech.score, fund?.score ?? null);

  const price = closes.at(-1) ?? 0;
  const prevClose = closes.at(-2) ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  const result: AnalysisResult = {
    ticker,
    type,
    name,
    currency,
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
    updatedAt: new Date().toISOString(),
  };

  if (type === "gold") {
    result.macro = await getMacro();
    const gram = await gramGoldTRY(price);
    if (gram != null) result.gramGoldTRY = gram;
  }

  return result;
}

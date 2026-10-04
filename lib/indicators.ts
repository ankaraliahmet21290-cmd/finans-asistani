import { RSI, MACD, SMA, BollingerBands } from "technicalindicators";
import type { Indicators } from "./types";

export function computeIndicators(closes: number[]): Indicators {
  if (closes.length < 30) {
    return { rsi: [], macd: [], sma50: [], sma200: [], bb: [] };
  }

  return {
    rsi: RSI.calculate({ values: closes, period: 14 }),
    macd: MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    }),
    sma50: SMA.calculate({ values: closes, period: 50 }),
    sma200: SMA.calculate({ values: closes, period: 200 }),
    bb: BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 }),
  };
}

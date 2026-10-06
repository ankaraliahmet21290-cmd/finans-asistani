import { RSI, MACD, SMA, EMA, BollingerBands, ADX, Stochastic, ATR } from "technicalindicators";
import type { Indicators, StochasticPoint, AdxPoint } from "./types";

export function computeIndicators(
  closes: number[],
  highs?: number[],
  lows?: number[],
  volumes?: number[]
): Indicators {
  if (closes.length < 30) {
    return {
      rsi: [],
      macd: [],
      sma50: [],
      sma200: [],
      bb: [],
      ema20: [],
      ema50: [],
      stoch: [],
      adx: [],
      atr: [],
      volSma20: [],
    };
  }

  const rsi = RSI.calculate({ values: closes, period: 14 });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const sma50 = SMA.calculate({ values: closes, period: 50 });
  const sma200 = SMA.calculate({ values: closes, period: 200 });
  const bb = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
  const ema20 = EMA.calculate({ values: closes, period: 20 });
  const ema50 = EMA.calculate({ values: closes, period: 50 });

  let stoch: StochasticPoint[] = [];
  let adx: AdxPoint[] = [];
  let atr: number[] = [];

  const effectiveHighs = highs && highs.length === closes.length ? highs : closes;
  const effectiveLows = lows && lows.length === closes.length ? lows : closes;

  if (effectiveHighs.length >= 15 && effectiveLows.length >= 15) {
    try {
      const rawStoch = Stochastic.calculate({
        high: effectiveHighs,
        low: effectiveLows,
        close: closes,
        period: 14,
        signalPeriod: 3,
      });
      stoch = rawStoch.map((s) => ({ k: s.k, d: s.d }));
    } catch {
      stoch = [];
    }

    try {
      const rawAdx = ADX.calculate({
        high: effectiveHighs,
        low: effectiveLows,
        close: closes,
        period: 14,
      });
      adx = rawAdx.map((a) => ({ adx: a.adx, pdi: a.pdi, mdi: a.mdi }));
    } catch {
      adx = [];
    }

    try {
      atr = ATR.calculate({
        high: effectiveHighs,
        low: effectiveLows,
        close: closes,
        period: 14,
      });
    } catch {
      atr = [];
    }
  }

  let volSma20: number[] = [];
  if (volumes && volumes.length >= 20) {
    try {
      volSma20 = SMA.calculate({ values: volumes, period: 20 });
    } catch {
      volSma20 = [];
    }
  }

  return {
    rsi,
    macd,
    sma50,
    sma200,
    bb,
    ema20,
    ema50,
    stoch,
    adx,
    atr,
    volSma20,
  };
}

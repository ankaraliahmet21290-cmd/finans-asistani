export type AssetType = "stock" | "gold";

export type Signal = "AL" | "SAT" | "TUT";

export type TimeframeKey =
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "1d"
  | "1wk"
  | "1mo";

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MacdPoint {
  MACD?: number;
  signal?: number;
  histogram?: number;
}

export interface BollingerPoint {
  middle: number;
  upper: number;
  lower: number;
  pb: number;
}

export interface StochasticPoint {
  k: number;
  d: number;
}

export interface AdxPoint {
  adx: number;
  pdi: number;
  mdi: number;
}

export interface VolatilityRisk {
  atr: number;
  atrPercent: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
}

export interface TrendStrength {
  adx: number;
  regime: "trending" | "ranging" | "strong_trend";
  direction: "up" | "down" | "neutral";
}

export interface Indicators {
  rsi: number[];
  macd: MacdPoint[];
  sma50: number[];
  sma200: number[];
  bb: BollingerPoint[];
  ema20?: number[];
  ema50?: number[];
  stoch?: StochasticPoint[];
  adx?: AdxPoint[];
  atr?: number[];
  volSma20?: number[];
}

export interface ScoreItem {
  name: string;
  point: number;
  weight?: number;
  category?: string;
  detail: string;
}

export interface TechnicalResult {
  score: number;
  signal: Signal;
  reasons: string[];
  items: ScoreItem[];
  categoryScores?: Record<string, number>;
  volatility?: VolatilityRisk;
  trendStrength?: TrendStrength;
}

export type FundamentalCategory = "valuation" | "profitability" | "solvency" | "growth";

export type FundamentalKey =
  | "pe"
  | "pb"
  | "peg"
  | "roe"
  | "roa"
  | "profitMargins"
  | "operatingMargins"
  | "debtToEquity"
  | "currentRatio"
  | "revenueGrowth"
  | "dividendYield";

export interface FundamentalMetric {
  key: FundamentalKey;
  label: string;
  category?: FundamentalCategory;
  weight?: number;
  value: number | null;
  display: string;
  point: number;
  detail: string;
}

export interface FundamentalResult {
  score: number | null;
  signal: Signal;
  metrics: FundamentalMetric[];
  categoryScores?: Partial<Record<FundamentalCategory, number>>;
}

export interface Fundamentals {
  pe: number | null;
  pb: number | null;
  peg: number | null;
  roe: number | null;
  roa: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  dividendYield: number | null;
}

export interface MacroPoint {
  ticker: string;
  label: string;
  value: number | null;
  changePercent: number | null;
}

export interface HybridAssessment {
  label: string;
  description: string;
  techWeight: number;
  fundWeight: number;
  alignment: "strong" | "moderate" | "divergent" | "neutral";
}

export interface AnalysisResult {
  ticker: string;
  type: AssetType;
  name: string;
  currency: string;
  timeframe?: string;
  price: number;
  change: number;
  changePercent: number;
  candles: Candle[];
  ind: Indicators;
  tech: TechnicalResult;
  fund: FundamentalResult | null;
  fundamentals: Fundamentals | null;
  score: number;
  signal: Signal;
  hybridAssessment?: HybridAssessment;
  macro?: MacroPoint[];
  gramGoldTRY?: number;
  updatedAt: string;
}

export interface SignalMailItem {
  ticker: string;
  signal: Signal;
  score: number;
  reasons: string[];
  price: number;
}

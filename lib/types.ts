export type AssetType = "stock" | "gold" | "commodity" | "forex" | "crypto" | "us_stock";

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

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  fibR1: number;
  fibR2: number;
  fibR3: number;
  fibS1: number;
  fibS2: number;
  fibS3: number;
}

export interface CryptoFundamentals {
  marketCap: number | null;
  volume24h: number | null;
  volumeToMarketCap: number | null;
  circulatingSupply: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  athDropPercent: number | null;
}

export interface ForexCommodityMetrics {
  pivotPoints?: PivotPoints;
  dxyValue: number | null;
  dxyChangePercent: number | null;
  us10yYield: number | null;
  goldSilverRatio: number | null;
  gramGoldTRY: number | null;
  atr: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

export interface UsStockFundamentals {
  targetMeanPrice: number | null;
  upsidePercent: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null; // 1.0 (Strong Buy) - 5.0 (Sell)
  numberOfAnalystOpinions?: number | null;
  pe: number | null;
  forwardPe: number | null;
  peg: number | null;
  pb: number | null;
  roe: number | null;
  revenueGrowth: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
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
  cryptoFundamentals?: CryptoFundamentals | null;
  forexCommodityMetrics?: ForexCommodityMetrics | null;
  usStockFundamentals?: UsStockFundamentals | null;
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
  timeframe?: string;
}

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

export interface Indicators {
  rsi: number[];
  macd: MacdPoint[];
  sma50: number[];
  sma200: number[];
  bb: BollingerPoint[];
}

export interface ScoreItem {
  name: string;
  point: number;
  detail: string;
}

export interface TechnicalResult {
  score: number;
  signal: Signal;
  reasons: string[];
  items: ScoreItem[];
}

export type FundamentalKey = "pe" | "pb" | "roe" | "debtToEquity" | "revenueGrowth";

export interface FundamentalMetric {
  key: FundamentalKey;
  label: string;
  value: number | null;
  display: string;
  point: number;
  detail: string;
}

export interface FundamentalResult {
  score: number | null;
  signal: Signal;
  metrics: FundamentalMetric[];
}

export interface Fundamentals {
  pe: number | null;
  pb: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
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

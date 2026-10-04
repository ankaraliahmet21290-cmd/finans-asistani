export type AssetType = "stock" | "gold";

export type Signal = "AL" | "SAT" | "TUT";

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

export interface AnalysisResult {
  ticker: string;
  type: AssetType;
  name: string;
  currency: string;
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

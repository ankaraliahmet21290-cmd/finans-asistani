import type { TimeframeKey } from "./timeframes";

export type PositionStatus = "active" | "stop_loss_hit" | "take_profit_hit" | "closed";

export type PositionCheckInterval = "1m" | "5m" | "15m" | "30m" | "1h" | "off";

export interface PositionEntry {
  id: string;
  ticker: string;
  code: string;
  name: string;
  timeframe: TimeframeKey;
  entryPrice: number;
  entryDate: string;
  stopLoss: number;
  takeProfit: number;
  status: PositionStatus;
  notifiedAt?: string | null;
  notifiedType?: "stop_loss" | "take_profit" | null;
  notes?: string;
  currentPrice?: number;
  changePercent?: number;
  profitLossPercent?: number;
  distanceToStopPercent?: number;
  distanceToTargetPercent?: number;
}

export interface PositionSettings {
  checkInterval: PositionCheckInterval;
  intervalMinutes: number;
  onlyTradingHours: boolean;
  lastCheckAt: string | null;
  lastAlarmSentAt: string | null;
  totalAlarmsSent: number;
}

export interface PositionTrackerData {
  settings: PositionSettings;
  positions: PositionEntry[];
  updatedAt: string;
}

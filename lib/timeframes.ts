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

export type CategoryTimeframeKey = TimeframeKey;

export interface TimeframeConfig {
  key: TimeframeKey;
  label: string;
  category: "dakikalik" | "saatlik" | "gunluk" | "haftalik" | "aylik";
  description: string;
  historyDays: number;
}

export const TIMEFRAMES: Record<TimeframeKey, TimeframeConfig> = {
  "5m": {
    key: "5m",
    label: "5 Dakikalık",
    category: "dakikalik",
    description: "Scalping ve çok hızlı gün içi sinyaller",
    historyDays: 7,
  },
  "10m": {
    key: "10m",
    label: "10 Dakikalık",
    category: "dakikalik",
    description: "Hızlı gün içi momentum ve salınım",
    historyDays: 14,
  },
  "15m": {
    key: "15m",
    label: "15 Dakikalık",
    category: "dakikalik",
    description: "Standart gün içi periyot ve trend takibi",
    historyDays: 20,
  },
  "30m": {
    key: "30m",
    label: "30 Dakikalık",
    category: "dakikalik",
    description: "Dengeli gün içi yön ve destek/direnç",
    historyDays: 30,
  },
  "1h": {
    key: "1h",
    label: "1 Saatlik",
    category: "saatlik",
    description: "Kısa vadeli gün içi sinyaller",
    historyDays: 45,
  },
  "2h": {
    key: "2h",
    label: "2 Saatlik",
    category: "saatlik",
    description: "Kısa-orta vadeli gün içi trend",
    historyDays: 60,
  },
  "4h": {
    key: "4h",
    label: "4 Saatlik",
    category: "saatlik",
    description: "Gün içi ana salınım ve yön",
    historyDays: 90,
  },
  "1d": {
    key: "1d",
    label: "Günlük",
    category: "gunluk",
    description: "Ana günlük trend ve kapanışlar",
    historyDays: 365,
  },
  "1wk": {
    key: "1wk",
    label: "Haftalık",
    category: "haftalik",
    description: "Orta-uzun vadeli trend",
    historyDays: 730,
  },
  "1mo": {
    key: "1mo",
    label: "Aylık",
    category: "aylik",
    description: "Makro ve uzun vadeli yatırım trendi",
    historyDays: 1460,
  },
};

export const VALID_TIMEFRAME_KEYS = new Set<TimeframeKey>([
  "5m",
  "10m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "1d",
  "1wk",
  "1mo",
]);

export function normalizeTimeframeKey(raw?: string | null): TimeframeKey {
  if (!raw) return "1d";
  const clean = raw.trim().toLowerCase();
  if (VALID_TIMEFRAME_KEYS.has(clean as TimeframeKey)) return clean as TimeframeKey;
  if (clean === "5m" || clean === "5dk" || clean === "5min") return "5m";
  if (clean === "10m" || clean === "10dk" || clean === "10min") return "10m";
  if (clean === "15m" || clean === "15dk" || clean === "15min") return "15m";
  if (clean === "30m" || clean === "30dk" || clean === "30min") return "30m";
  if (clean === "1s" || clean === "saatlik") return "1h";
  if (clean === "2s") return "2h";
  if (clean === "4s") return "4h";
  if (clean === "1g" || clean === "gunluk" || clean === "günlük" || clean === "daily") return "1d";
  if (clean === "1h" || clean === "haftalik" || clean === "haftalık" || clean === "weekly") return "1wk";
  if (clean === "1a" || clean === "aylik" || clean === "aylık" || clean === "monthly") return "1mo";
  return "1d";
}


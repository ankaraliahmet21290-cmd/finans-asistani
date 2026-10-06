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

export type CategoryTimeframeKey = "1h" | "2h" | "4h" | "1wk" | "1mo";

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

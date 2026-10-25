export type WatchlistCheckInterval =
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "daily"
  | "off";

export interface WatchlistSettings {
  checkInterval: WatchlistCheckInterval;
  intervalMinutes: number;
  onlyTradingHours: boolean;
  lastCheckAt?: string | null;
  lastChangedAt?: string | null;
}

export const DEFAULT_WATCHLIST_SETTINGS: WatchlistSettings = {
  checkInterval: "15m",
  intervalMinutes: 15,
  onlyTradingHours: true,
  lastCheckAt: null,
  lastChangedAt: null,
};

export const WATCHLIST_INTERVAL_TO_MINUTES: Record<WatchlistCheckInterval, number> = {
  "5m": 5,
  "10m": 10,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "2h": 120,
  "4h": 240,
  daily: 1440,
  off: 0,
};

export function normalizeWatchlistCheckInterval(raw: string): WatchlistCheckInterval {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (["5m", "5dk", "5dakika", "5"].includes(clean)) return "5m";
  if (["10m", "10dk", "10dakika", "10"].includes(clean)) return "10m";
  if (["15m", "15dk", "15dakika", "15"].includes(clean)) return "15m";
  if (["30m", "30dk", "30dakika", "30"].includes(clean)) return "30m";
  if (["1h", "1s", "1saat", "60m", "60"].includes(clean)) return "1h";
  if (["2h", "2s", "2saat", "120m", "120"].includes(clean)) return "2h";
  if (["4h", "4s", "4saat", "240m", "240"].includes(clean)) return "4h";
  if (["daily", "gunluk", "günlük", "day", "1440"].includes(clean)) return "daily";
  if (["off", "kapali", "kapalı", "devredisi", "0"].includes(clean)) return "off";
  return "15m";
}

export interface WatchlistIntervalOption {
  key: WatchlistCheckInterval;
  label: string;
  badge: string;
  desc: string;
  minutes: number;
}

export const WATCHLIST_INTERVAL_OPTIONS: WatchlistIntervalOption[] = [
  { key: "5m", label: "5 Dakika", badge: "5dk", desc: "Çok hızlı kontrol (yüksek sıklık)", minutes: 5 },
  { key: "10m", label: "10 Dakika", badge: "10dk", desc: "Hızlı takip", minutes: 10 },
  { key: "15m", label: "15 Dakika", badge: "15dk", desc: "Standart seans içi kontrol", minutes: 15 },
  { key: "30m", label: "30 Dakika", badge: "30dk", desc: "Dengeli kontrol", minutes: 30 },
  { key: "1h", label: "1 Saat", badge: "1S", desc: "Saatlik kontrol", minutes: 60 },
  { key: "2h", label: "2 Saat", badge: "2S", desc: "2 saatlik aralık", minutes: 120 },
  { key: "4h", label: "4 Saat", badge: "4S", desc: "Yarım günlük kontrol", minutes: 240 },
  { key: "daily", label: "Günlük", badge: "Günlük", desc: "Seans kapanışında günde 1 kez", minutes: 1440 },
  { key: "off", label: "Kapalı", badge: "Kapalı", desc: "Otomatik kontrol kapalı", minutes: 0 },
];

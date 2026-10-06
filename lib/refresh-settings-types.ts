export type RefreshInterval = 0 | 15 | 30 | 60 | 120 | 300;

export interface RefreshIntervalOption {
  value: RefreshInterval;
  key: string;
  label: string;
  desc: string;
  badge: string;
}

export const REFRESH_INTERVAL_OPTIONS: RefreshIntervalOption[] = [
  {
    value: 15,
    key: "15s",
    label: "15 sn",
    desc: "Çok Hızlı (Gün içi anlık)",
    badge: "15 SN",
  },
  {
    value: 30,
    key: "30s",
    label: "30 sn",
    desc: "Önerilen (Hızlı & Dengeli)",
    badge: "30 SN",
  },
  {
    value: 60,
    key: "60s",
    label: "1 dk",
    desc: "Standart Akış",
    badge: "1 DK",
  },
  {
    value: 120,
    key: "120s",
    label: "2 dk",
    desc: "Düşük Trafik",
    badge: "2 DK",
  },
  {
    value: 300,
    key: "300s",
    label: "5 dk",
    desc: "Tasarruflu",
    badge: "5 DK",
  },
  {
    value: 0,
    key: "off",
    label: "Kapalı",
    desc: "Yalnızca Elle Yenileme",
    badge: "KAPALI",
  },
];

export interface RefreshSettingsConfig {
  seconds: RefreshInterval;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  cacheTtlMs: number;
  updatedAt: string;
}

export const DEFAULT_REFRESH_SETTINGS: RefreshSettingsConfig = {
  seconds: 30,
  key: "30s",
  label: "30 sn",
  description: "Önerilen (Hızlı & Dengeli)",
  enabled: true,
  cacheTtlMs: 30_000,
  updatedAt: new Date().toISOString(),
};

/**
 * Normalizes raw string/number into a valid RefreshIntervalOption.
 */
export function normalizeRefreshInterval(raw: string | number): RefreshIntervalOption {
  const clean = String(raw).trim().toLowerCase().replace(/\s+/g, "");

  if (clean === "15" || clean === "15s" || clean === "15sn") {
    return REFRESH_INTERVAL_OPTIONS[0];
  }
  if (clean === "30" || clean === "30s" || clean === "30sn") {
    return REFRESH_INTERVAL_OPTIONS[1];
  }
  if (clean === "60" || clean === "60s" || clean === "1m" || clean === "1dk") {
    return REFRESH_INTERVAL_OPTIONS[2];
  }
  if (clean === "120" || clean === "120s" || clean === "2m" || clean === "2dk") {
    return REFRESH_INTERVAL_OPTIONS[3];
  }
  if (clean === "300" || clean === "300s" || clean === "5m" || clean === "5dk") {
    return REFRESH_INTERVAL_OPTIONS[4];
  }
  if (clean === "0" || clean === "off" || clean === "kapali" || clean === "kapalı" || clean === "none") {
    return REFRESH_INTERVAL_OPTIONS[5];
  }

  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    if (num <= 0) return REFRESH_INTERVAL_OPTIONS[5];
    if (num <= 20) return REFRESH_INTERVAL_OPTIONS[0];
    if (num <= 45) return REFRESH_INTERVAL_OPTIONS[1];
    if (num <= 90) return REFRESH_INTERVAL_OPTIONS[2];
    if (num <= 180) return REFRESH_INTERVAL_OPTIONS[3];
    return REFRESH_INTERVAL_OPTIONS[4];
  }

  return REFRESH_INTERVAL_OPTIONS[1]; // Default to 30 sn
}

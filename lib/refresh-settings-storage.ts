import fs from "fs/promises";
import path from "path";
import {
  type RefreshInterval,
  type RefreshIntervalOption,
  type RefreshSettingsConfig,
  type MarketRefreshSettings,
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_SETTINGS,
  normalizeRefreshInterval,
} from "./refresh-settings-types";

export {
  type RefreshInterval,
  type RefreshIntervalOption,
  type RefreshSettingsConfig,
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_SETTINGS,
  normalizeRefreshInterval,
};

export const REFRESH_SETTINGS_FILE_PATH = path.join(process.cwd(), "refresh-settings.md");

/**
 * Parses markdown table content from refresh-settings.md.
 */
export function parseRefreshSettingsMarkdown(content: string): RefreshSettingsConfig {
  const lines = content.split(/\r?\n/);
  const params: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Table rows: | Parametre | Değer | Açıklama |
    if (line.startsWith("|") && line.endsWith("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (parts.length >= 2) {
        const key = parts[0].toLowerCase();
        if (key && !key.startsWith("---") && key !== "parametre") {
          params[key] = parts[1];
        }
      }
      continue;
    }

    // Key-value lines: - Sıklık: 30s
    const kvMatch = line.match(/^[-*]?\s*([^:]+):\s*(.+)$/);
    if (kvMatch) {
      params[kvMatch[1].trim().toLowerCase()] = kvMatch[2].trim();
    }
  }

  const rawVal =
    params["saniye"] ||
    params["sıklık"] ||
    params["siklik"] ||
    params["aralık"] ||
    params["interval"] ||
    params["değer"] ||
    "30s";

  const opt = normalizeRefreshInterval(rawVal);
  const isEnabled = opt.value > 0;
  const updatedAt = params["son güncelleme"] || params["tarih"] || new Date().toISOString();

  const bistVal = params["bist sıklık"] || params["bist siklik"] || params["bist"] || rawVal;
  const cryptoVal = params["kripto sıklık"] || params["kripto siklik"] || params["kripto"] || params["crypto"] || "15s";
  const commodityVal = params["emtia & fx sıklık"] || params["emtia sıklık"] || params["emtia"] || params["forex"] || "60s";
  const usStocksVal = params["abd borsası sıklık"] || params["abd sıklık"] || params["abd"] || params["us_stocks"] || rawVal;

  const markets = {
    bist: normalizeRefreshInterval(bistVal).value,
    crypto: normalizeRefreshInterval(cryptoVal).value,
    commodity_forex: normalizeRefreshInterval(commodityVal).value,
    us_stocks: normalizeRefreshInterval(usStocksVal).value,
  };

  return {
    seconds: opt.value,
    key: opt.key,
    label: opt.label,
    description: opt.desc,
    enabled: isEnabled,
    cacheTtlMs: opt.value > 0 ? opt.value * 1000 : 30_000,
    updatedAt,
    markets,
  };
}

/**
 * Formats a RefreshSettingsConfig into clean Markdown for refresh-settings.md.
 */
export function formatRefreshSettingsMarkdown(config: RefreshSettingsConfig): string {
  const isEnabled = config.seconds > 0;
  const opt = normalizeRefreshInterval(config.seconds);
  const bistOpt = normalizeRefreshInterval(config.markets?.bist ?? config.seconds);
  const cryptoOpt = normalizeRefreshInterval(config.markets?.crypto ?? 15);
  const commOpt = normalizeRefreshInterval(config.markets?.commodity_forex ?? 60);
  const usOpt = normalizeRefreshInterval(config.markets?.us_stocks ?? config.seconds);

  return `# Veri Yenileme Ayarları

Bu dosya Finans Asistanı ekranındaki piyasa verilerinin otomatik yenilenme sıklığını ve önbellek (cache) süresini belirler.
Arayüz üzerinden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan bu dosya elle düzenlenerek de ayarlanabilir.

| Parametre | Değer | Açıklama |
| --- | --- | --- |
| Sıklık | ${opt.key} | Genel varsayılan yenileme aralığı: 15s, 30s, 60s, 120s, 300s, off |
| BIST Sıklık | ${bistOpt.key} | Borsa İstanbul veri yenileme aralığı |
| Kripto Sıklık | ${cryptoOpt.key} | Kripto para veri yenileme aralığı (7/24) |
| Emtia & FX Sıklık | ${commOpt.key} | Altın, döviz, emtia veri yenileme aralığı |
| ABD Borsası Sıklık | ${usOpt.key} | Amerikan borsası (Nasdaq/S&P) veri yenileme aralığı |
| Görünen Ad | ${opt.label} | ${opt.desc} |
| Saniye | ${opt.value} | Sayısal saniye karşılığı (0 = kapalı) |
| Aktif | ${isEnabled ? "Evet" : "Hayır"} | Otomatik veri yenileme açık/kapalı |
| Önbellek Süresi | ${opt.value > 0 ? opt.value : 30} sn | Sunucu veri TTL süresi |
| Son Güncelleme | ${config.updatedAt || new Date().toISOString()} | Son güncelleme zamanı |

---

### Kullanılabilir Yenileme Sıklığı Seçenekleri:
- **15 sn** (\`15s\` / \`15\`): Çok Hızlı (Gün içi anlık)
- **30 sn** (\`30s\` / \`30\`): Önerilen (Hızlı & Dengeli)
- **1 dk** (\`60s\` / \`60\` / \`1m\`): Standart Akış
- **2 dk** (\`120s\` / \`120\` / \`2m\`): Düşük Trafik
- **5 dk** (\`300s\` / \`300\` / \`5m\`): Tasarruflu
- **Kapalı** (\`off\` / \`0\`): Yalnızca Elle Yenileme
`;
}

// In-memory cache for fast synchronous access
let cachedConfig: RefreshSettingsConfig = { ...DEFAULT_REFRESH_SETTINGS };
let hasReadOnce = false;

/**
 * Reads refresh settings from refresh-settings.md. Creates default file if not found.
 */
export async function getRefreshSettingsFromFile(): Promise<RefreshSettingsConfig> {
  try {
    const content = await fs.readFile(REFRESH_SETTINGS_FILE_PATH, "utf-8");
    const parsed = parseRefreshSettingsMarkdown(content);
    cachedConfig = parsed;
    hasReadOnce = true;
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveRefreshSettingsToFile(30);
      cachedConfig = { ...DEFAULT_REFRESH_SETTINGS };
      hasReadOnce = true;
      return cachedConfig;
    }
    console.error("[refresh-settings-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

/**
 * Synchronous getter returning the latest cached config for quick server use.
 */
export function getActiveRefreshConfig(): RefreshSettingsConfig {
  if (!hasReadOnce) {
    // Fire-and-forget background read to ensure freshness
    void getRefreshSettingsFromFile();
  }
  return cachedConfig;
}

export interface SaveRefreshSettingsOptions {
  seconds?: RefreshInterval | string | number;
  market?: "bist" | "crypto" | "commodity_forex" | "us_stocks";
  markets?: Partial<RefreshSettingsConfig["markets"]>;
}

export function getMarketRefreshSeconds(config: RefreshSettingsConfig, market?: string): RefreshInterval {
  if (market === "crypto") return config.markets?.crypto ?? 15;
  if (market === "commodity_forex") return config.markets?.commodity_forex ?? 60;
  if (market === "us_stocks") return config.markets?.us_stocks ?? config.seconds;
  if (market === "bist") return config.markets?.bist ?? config.seconds;
  return config.seconds;
}

/**
 * Saves refresh settings to refresh-settings.md with per-market support.
 */
export async function saveRefreshSettingsToFile(
  input: RefreshInterval | string | number | SaveRefreshSettingsOptions
): Promise<RefreshSettingsConfig> {
  const current = await getRefreshSettingsFromFile();
  const currentMarkets: MarketRefreshSettings = current.markets
    ? { ...current.markets }
    : { bist: 30, crypto: 15, commodity_forex: 60, us_stocks: 30 };

  let nextSeconds: RefreshInterval = current.seconds;
  let nextMarkets: MarketRefreshSettings = { ...currentMarkets };

  if (typeof input === "object" && input !== null) {
    if (input.market) {
      const opt = normalizeRefreshInterval(input.seconds ?? current.seconds);
      if (input.market === "bist") nextMarkets.bist = opt.value;
      if (input.market === "crypto") nextMarkets.crypto = opt.value;
      if (input.market === "commodity_forex") nextMarkets.commodity_forex = opt.value;
      if (input.market === "us_stocks") nextMarkets.us_stocks = opt.value;
    } else {
      if (input.seconds !== undefined) {
        nextSeconds = normalizeRefreshInterval(input.seconds).value;
      }
      if (input.markets) {
        nextMarkets = { ...nextMarkets, ...input.markets };
      }
    }
  } else {
    nextSeconds = normalizeRefreshInterval(input).value;
  }

  const opt = normalizeRefreshInterval(nextSeconds);
  const config: RefreshSettingsConfig = {
    seconds: opt.value,
    key: opt.key,
    label: opt.label,
    description: opt.desc,
    enabled: opt.value > 0,
    cacheTtlMs: opt.value > 0 ? opt.value * 1000 : 30_000,
    updatedAt: new Date().toISOString(),
    markets: nextMarkets,
  };

  const mdContent = formatRefreshSettingsMarkdown(config);
  await fs.writeFile(REFRESH_SETTINGS_FILE_PATH, mdContent, "utf-8");
  cachedConfig = config;
  hasReadOnce = true;
  return config;
}

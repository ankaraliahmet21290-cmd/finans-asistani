import fs from "fs/promises";
import path from "path";
import { TIMEFRAMES, type TimeframeKey } from "./timeframes";

export interface TimeframeSettingsConfig {
  watchlist: TimeframeKey;
  topSignals: TimeframeKey;
  bistSearch: TimeframeKey;
  updatedAt: string;
}

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

export const DEFAULT_TIMEFRAME_SETTINGS: TimeframeSettingsConfig = {
  watchlist: "1d",
  topSignals: "1d",
  bistSearch: "1d",
  updatedAt: new Date().toISOString(),
};

export const TIMEFRAME_SETTINGS_FILE_PATH = path.join(process.cwd(), "timeframe-settings.md");

/**
 * Validates and normalizes a timeframe key.
 */
export function normalizeTimeframeKey(raw?: string | null): TimeframeKey {
  if (!raw) return "1d";
  const clean = raw.trim().toLowerCase();
  if (VALID_TIMEFRAME_KEYS.has(clean as TimeframeKey)) return clean as TimeframeKey;
  // Common Turkish / colloquial aliases
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

/**
 * Parses markdown table content from timeframe-settings.md.
 */
export function parseTimeframeSettingsMarkdown(content: string): TimeframeSettingsConfig {
  const lines = content.split(/\r?\n/);
  const result: TimeframeSettingsConfig = { ...DEFAULT_TIMEFRAME_SETTINGS };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Table rows: | Panel | Periyot Kodu | Görünen Ad | Açıklama |
    if (line.startsWith("|") && line.endsWith("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (parts.length >= 2) {
        const panelName = parts[0].toLowerCase();
        const code = normalizeTimeframeKey(parts[1]);

        if (panelName.startsWith("---") || panelName === "panel") continue;

        if (panelName.includes("takip") || panelName.includes("watchlist")) {
          result.watchlist = code;
        } else if (panelName.includes("lider") || panelName.includes("top") || panelName.includes("sinyal")) {
          result.topSignals = code;
        } else if (
          panelName.includes("bist") ||
          panelName.includes("arama") ||
          panelName.includes("tum") ||
          panelName.includes("tüm")
        ) {
          result.bistSearch = code;
        }
      }
      continue;
    }

    // Key-value lines: - Takip Listesi: 1d
    const kvMatch = line.match(/^[-*]?\s*([^:]+):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase();
      const val = normalizeTimeframeKey(kvMatch[2].trim());

      if (key.includes("takip") || key.includes("watchlist")) {
        result.watchlist = val;
      } else if (key.includes("lider") || key.includes("top")) {
        result.topSignals = val;
      } else if (
        key.includes("bist") ||
        key.includes("arama") ||
        key.includes("tum") ||
        key.includes("tüm")
      ) {
        result.bistSearch = val;
      } else if (key.includes("güncelleme") || key.includes("tarih")) {
        result.updatedAt = kvMatch[2].trim().replace(/\*+/g, "").trim();
      }
    }
  }

  return result;
}

/**
 * Formats a TimeframeSettingsConfig into clean Markdown for timeframe-settings.md.
 */
export function formatTimeframeSettingsMarkdown(config: TimeframeSettingsConfig): string {
  const wlInfo = TIMEFRAMES[config.watchlist] ?? TIMEFRAMES["1d"];
  const topInfo = TIMEFRAMES[config.topSignals] ?? TIMEFRAMES["1d"];
  const bistInfo = TIMEFRAMES[config.bistSearch || "1d"] ?? TIMEFRAMES["1d"];

  return `# Periyot ve Zaman Dilimi Ayarları

Bu dosya Finans Asistanı takip listesi, lider sinyaller ve tüm BIST şirketleri arama bölümü için analiz zaman dilimlerini (mum periyotlarını) belirler.
Arayüz üzerinden periyot seçildiğinde bu dosya otomatik güncellenir veya doğrudan bu dosya elle düzenlenebilir.

| Panel | Periyot Kodu | Görünen Ad | Açıklama |
| --- | --- | --- | --- |
| Takip Listesi | ${config.watchlist} | ${wlInfo.label} | ${wlInfo.description} |
| Lider Sinyaller | ${config.topSignals} | ${topInfo.label} | ${topInfo.description} |
| Tüm BIST Şirketleri | ${config.bistSearch || "1d"} | ${bistInfo.label} | ${bistInfo.description} |

---

### Kullanılabilir Periyot Seçenekleri:
- **5 Dakikalık** (\`5m\`): Scalping ve çok hızlı gün içi sinyaller
- **10 Dakikalık** (\`10m\`): Hızlı gün içi momentum ve salınım
- **15 Dakikalık** (\`15m\`): Standart gün içi periyot ve trend takibi
- **30 Dakikalık** (\`30m\`): Dengeli gün içi yön ve destek/direnç
- **1 Saatlik** (\`1h\`): Kısa vadeli gün içi sinyaller
- **2 Saatlik** (\`2h\`): Kısa-orta vadeli gün içi trend
- **4 Saatlik** (\`4h\`): Gün içi ana salınım ve yön
- **Günlük** (\`1d\`): Ana günlük trend ve kapanışlar (Önerilen)
- **Haftalık** (\`1wk\`): Orta-uzun vadeli trend
- **Aylık** (\`1mo\`): Makro ve uzun vadeli yatırım trendi

*Son Güncelleme: ${config.updatedAt || new Date().toISOString()}*
`;
}

// In-memory cache for fast synchronous server access
let cachedConfig: TimeframeSettingsConfig = { ...DEFAULT_TIMEFRAME_SETTINGS };
let hasReadOnce = false;

/**
 * Reads settings from timeframe-settings.md. Creates default file if not found.
 */
export async function getTimeframeSettingsFromFile(): Promise<TimeframeSettingsConfig> {
  try {
    const content = await fs.readFile(TIMEFRAME_SETTINGS_FILE_PATH, "utf-8");
    const parsed = parseTimeframeSettingsMarkdown(content);
    cachedConfig = parsed;
    hasReadOnce = true;
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveTimeframeSettingsToFile(DEFAULT_TIMEFRAME_SETTINGS);
      cachedConfig = { ...DEFAULT_TIMEFRAME_SETTINGS };
      hasReadOnce = true;
      return cachedConfig;
    }
    console.error("[timeframe-settings-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

/**
 * Synchronous getter returning the latest cached config for quick server use.
 */
export function getActiveTimeframeSettings(): TimeframeSettingsConfig {
  if (!hasReadOnce) {
    void getTimeframeSettingsFromFile();
  }
  return cachedConfig;
}

/**
 * Saves timeframe settings to timeframe-settings.md.
 */
export async function saveTimeframeSettingsToFile(
  updates: Partial<TimeframeSettingsConfig>
): Promise<TimeframeSettingsConfig> {
  const current = hasReadOnce ? cachedConfig : await getTimeframeSettingsFromFile();

  const newConfig: TimeframeSettingsConfig = {
    watchlist: updates.watchlist ? normalizeTimeframeKey(updates.watchlist) : current.watchlist,
    topSignals: updates.topSignals ? normalizeTimeframeKey(updates.topSignals) : current.topSignals,
    bistSearch: updates.bistSearch ? normalizeTimeframeKey(updates.bistSearch) : (current.bistSearch || "1d"),
    updatedAt: new Date().toISOString(),
  };

  const mdContent = formatTimeframeSettingsMarkdown(newConfig);
  await fs.writeFile(TIMEFRAME_SETTINGS_FILE_PATH, mdContent, "utf-8");
  cachedConfig = newConfig;
  hasReadOnce = true;
  return newConfig;
}

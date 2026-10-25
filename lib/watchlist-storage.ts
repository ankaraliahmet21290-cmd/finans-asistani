import fs from "fs/promises";
import path from "path";
import type { AssetType } from "./types";
import { findBistCompany } from "./bist";
import { detectAssetCategory, CURATED_MARKET_ITEMS } from "./markets";

import { normalizeTimeframeKey, type TimeframeKey } from "./timeframe-settings-storage";

export interface WatchlistFileEntry {
  ticker: string;
  type: AssetType;
  name?: string;
  timeframe?: TimeframeKey;
}

import {
  type WatchlistCheckInterval,
  type WatchlistSettings,
  type WatchlistIntervalOption,
  DEFAULT_WATCHLIST_SETTINGS,
  WATCHLIST_INTERVAL_TO_MINUTES,
  WATCHLIST_INTERVAL_OPTIONS,
  normalizeWatchlistCheckInterval,
} from "./watchlist-settings-types";

export {
  type WatchlistCheckInterval,
  type WatchlistSettings,
  type WatchlistIntervalOption,
  DEFAULT_WATCHLIST_SETTINGS,
  WATCHLIST_INTERVAL_TO_MINUTES,
  WATCHLIST_INTERVAL_OPTIONS,
  normalizeWatchlistCheckInterval,
};

export const WATCHLIST_FILE_PATH = path.join(process.cwd(), "watchlist.md");

export const DEFAULT_ENTRIES: WatchlistFileEntry[] = [
  { ticker: "THYAO.IS", type: "stock", name: "Türk Hava Yolları", timeframe: "1d" },
  { ticker: "ASELS.IS", type: "stock", name: "Aselsan", timeframe: "1d" },
  { ticker: "AAPL", type: "stock", name: "Apple Inc.", timeframe: "1d" },
  { ticker: "GC=F", type: "gold", name: "Ons Altın Vadeli", timeframe: "1d" },
];

/**
 * Parses markdown content into a list of WatchlistFileEntry.
 * Supports markdown tables (| Ticker | Type | Name | Timeframe |) and bullet points (- TICKER).
 */
export function parseWatchlistMarkdown(content: string): WatchlistFileEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: WatchlistFileEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for markdown table row: | Ticker | Type | Name | Timeframe |
    if (line.startsWith("|") && line.endsWith("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (parts.length === 0) continue;

      const firstCol = parts[0].toUpperCase();
      // Skip header row or delimiter row
      if (
        firstCol === "SEMBOL" ||
        firstCol === "TICKER" ||
        firstCol === "SYMBOL" ||
        firstCol.startsWith("---") ||
        firstCol.startsWith(":")
      ) {
        continue;
      }

      const ticker = parts[0].trim().toUpperCase();
      if (!ticker) continue;

      const rawType = (parts[1] || "").toLowerCase().trim();
      const type: AssetType = (
        ["gold", "crypto", "forex", "commodity", "us_stock", "stock"].includes(rawType)
          ? rawType
          : detectAssetCategory(ticker)
      ) as AssetType;

      const bist = findBistCompany(ticker);
      const curated = CURATED_MARKET_ITEMS[ticker];
      const name = parts[2]?.trim() || bist?.name || curated?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);
      const rawTf = parts[3]?.trim();
      const timeframe: TimeframeKey | undefined = rawTf ? normalizeTimeframeKey(rawTf) : undefined;

      if (!seen.has(ticker)) {
        seen.add(ticker);
        entries.push({ ticker, type, name, timeframe });
      }
      continue;
    }

    // Fallback: bullet points like "- THYAO.IS" or "- THYAO.IS (stock) [1h] - Türk Hava Yolları"
    const bulletMatch = line.match(/^[-*]\s*([A-Za-z0-9.=_-]+)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?(?:\s*[-–]\s*(.+))?$/);
    if (bulletMatch) {
      const ticker = bulletMatch[1].trim().toUpperCase();
      if (!ticker) continue;

      const hint = (bulletMatch[2] || "").toLowerCase().trim();
      const rawTf = bulletMatch[3]?.trim();
      const extraName = bulletMatch[4]?.trim();
      const type: AssetType = (
        ["gold", "crypto", "forex", "commodity", "us_stock", "stock"].includes(hint)
          ? hint
          : detectAssetCategory(ticker)
      ) as AssetType;
      const bist = findBistCompany(ticker);
      const curated = CURATED_MARKET_ITEMS[ticker];
      const name = extraName || bist?.name || curated?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);
      const timeframe: TimeframeKey | undefined = rawTf ? normalizeTimeframeKey(rawTf) : undefined;

      if (!seen.has(ticker)) {
        seen.add(ticker);
        entries.push({ ticker, type, name, timeframe });
      }
    }
  }

  return entries.length > 0 ? entries : DEFAULT_ENTRIES;
}

export function parseWatchlistWithSettings(content: string): {
  settings: WatchlistSettings;
  entries: WatchlistFileEntry[];
} {
  const settings: WatchlistSettings = { ...DEFAULT_WATCHLIST_SETTINGS };
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("- **Tarama Sıklığı:**") || line.startsWith("- **Tarama:**")) {
      const val = line.split(":")[1]?.trim() || "";
      settings.checkInterval = normalizeWatchlistCheckInterval(val);
      settings.intervalMinutes = WATCHLIST_INTERVAL_TO_MINUTES[settings.checkInterval];
      continue;
    }
    if (line.startsWith("- **Yalnızca Seans İçi:**") || line.startsWith("- **Sadece Seans İçi:**")) {
      const val = line.split(":")[1]?.trim().toLowerCase() || "";
      settings.onlyTradingHours = val.includes("evet") || val.includes("true");
      continue;
    }
    if (line.startsWith("- **Son Kontrol:**")) {
      const parts = line.split(":");
      const val = parts.slice(1).join(":").trim();
      if (val && val !== "—" && val !== "-") {
        settings.lastCheckAt = val;
      }
      continue;
    }
    if (line.startsWith("- **Son Sinyal Değişimi:**") || line.startsWith("- **Son Değişim:**")) {
      const parts = line.split(":");
      const val = parts.slice(1).join(":").trim();
      if (val && val !== "—" && val !== "-") {
        settings.lastChangedAt = val;
      }
      continue;
    }
  }

  const entries = parseWatchlistMarkdown(content);
  return { settings, entries };
}

/**
 * Serializes WatchlistFileEntry array into clean Markdown table format.
 */
export function formatWatchlistMarkdown(
  entries: WatchlistFileEntry[],
  settings: WatchlistSettings = DEFAULT_WATCHLIST_SETTINGS
): string {
  const rows = entries.map((e) => {
    const bist = findBistCompany(e.ticker);
    const displayName = e.name || bist?.name || (e.type === "gold" ? "Ons Altın Vadeli" : "");
    const tf = e.timeframe || "1d";
    return `| ${e.ticker} | ${e.type} | ${displayName} | ${tf} |`;
  });

  return `# Takip Listesi

Bu dosya Finans Asistanı takip listesindeki varlıkları içerir.
Arayüz üzerinden veya doğrudan bu dosya düzenlenerek varlık eklenip çıkarılabilir.

## Sinyal Değişim Kontrol Ayarları
- **Tarama Sıklığı:** ${settings.checkInterval}
- **Yalnızca Seans İçi:** ${settings.onlyTradingHours ? "Evet" : "Hayır"}
- **Son Kontrol:** ${settings.lastCheckAt ?? "—"}
- **Son Sinyal Değişimi:** ${settings.lastChangedAt ?? "—"}

| Sembol | Tür | Ad | Periyot |
| --- | --- | --- | --- |
${rows.join("\n")}
`;
}

/**
 * Reads watchlist and settings from watchlist.md.
 */
export async function getWatchlistWithSettingsFromFile(): Promise<{
  settings: WatchlistSettings;
  entries: WatchlistFileEntry[];
}> {
  try {
    const content = await fs.readFile(WATCHLIST_FILE_PATH, "utf-8");
    return parseWatchlistWithSettings(content);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveWatchlistWithSettingsToFile(DEFAULT_ENTRIES, DEFAULT_WATCHLIST_SETTINGS);
      return { settings: DEFAULT_WATCHLIST_SETTINGS, entries: DEFAULT_ENTRIES };
    }
    console.error("[watchlist-storage] Okuma hatası:", err);
    return { settings: DEFAULT_WATCHLIST_SETTINGS, entries: DEFAULT_ENTRIES };
  }
}

/**
 * Reads watchlist from watchlist.md. Creates default file if not found.
 */
export async function getWatchlistFromFile(): Promise<WatchlistFileEntry[]> {
  const { entries } = await getWatchlistWithSettingsFromFile();
  return entries;
}

/**
 * Gets watchlist settings from watchlist.md.
 */
export async function getWatchlistSettingsFromFile(): Promise<WatchlistSettings> {
  const { settings } = await getWatchlistWithSettingsFromFile();
  return settings;
}

/**
 * Saves both entries and settings to watchlist.md.
 */
export async function saveWatchlistWithSettingsToFile(
  entries: WatchlistFileEntry[],
  settings: WatchlistSettings
): Promise<void> {
  const content = formatWatchlistMarkdown(entries, settings);
  await fs.writeFile(WATCHLIST_FILE_PATH, content, "utf-8");
}

/**
 * Saves given list to watchlist.md while preserving settings.
 */
export async function saveWatchlistToFile(entries: WatchlistFileEntry[]): Promise<void> {
  const { settings } = await getWatchlistWithSettingsFromFile().catch(() => ({
    settings: DEFAULT_WATCHLIST_SETTINGS,
    entries: [],
  }));
  await saveWatchlistWithSettingsToFile(entries, settings);
}

/**
 * Updates watchlist settings in watchlist.md.
 */
export async function saveWatchlistSettingsToFile(
  partial: Partial<WatchlistSettings>
): Promise<WatchlistSettings> {
  const { settings, entries } = await getWatchlistWithSettingsFromFile();
  const checkInterval = partial.checkInterval
    ? normalizeWatchlistCheckInterval(partial.checkInterval)
    : settings.checkInterval;
  const intervalMinutes = WATCHLIST_INTERVAL_TO_MINUTES[checkInterval];

  const updatedSettings: WatchlistSettings = {
    ...settings,
    ...partial,
    checkInterval,
    intervalMinutes,
  };

  await saveWatchlistWithSettingsToFile(entries, updatedSettings);
  return updatedSettings;
}

/**
 * Adds an entry to watchlist.md if not already present, or updates timeframe if already exists.
 */
export async function addWatchEntryToFile(entry: WatchlistFileEntry): Promise<WatchlistFileEntry[]> {
  const { settings, entries: current } = await getWatchlistWithSettingsFromFile();
  const normalizedTicker = entry.ticker.trim().toUpperCase();

  const existingIndex = current.findIndex((e) => e.ticker.toUpperCase() === normalizedTicker);
  let updated: WatchlistFileEntry[];

  if (existingIndex >= 0) {
    updated = current.map((e, idx) =>
      idx === existingIndex
        ? { ...e, ...entry, timeframe: entry.timeframe ?? e.timeframe ?? "1d" }
        : e
    );
  } else {
    updated = [...current, { ...entry, ticker: normalizedTicker, timeframe: entry.timeframe ?? "1d" }];
  }

  await saveWatchlistWithSettingsToFile(updated, settings);
  return updated;
}

/**
 * Updates timeframe for a specific symbol in watchlist.md.
 */
export async function updateWatchEntryTimeframeToFile(
  ticker: string,
  timeframe: TimeframeKey
): Promise<WatchlistFileEntry[]> {
  const { settings, entries: current } = await getWatchlistWithSettingsFromFile();
  const normalizedTicker = ticker.trim().toUpperCase();
  const normTf = normalizeTimeframeKey(timeframe);

  const updated = current.map((e) =>
    e.ticker.toUpperCase() === normalizedTicker ? { ...e, timeframe: normTf } : e
  );

  await saveWatchlistWithSettingsToFile(updated, settings);
  return updated;
}

/**
 * Removes an entry from watchlist.md by ticker.
 */
export async function removeWatchEntryFromFile(ticker: string): Promise<WatchlistFileEntry[]> {
  const { settings, entries: current } = await getWatchlistWithSettingsFromFile();
  const normalizedTicker = ticker.trim().toUpperCase();
  const updated = current.filter((e) => e.ticker.toUpperCase() !== normalizedTicker);
  await saveWatchlistWithSettingsToFile(updated, settings);
  return updated;
}

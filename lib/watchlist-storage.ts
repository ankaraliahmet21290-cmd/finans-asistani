import fs from "fs/promises";
import path from "path";
import type { AssetType } from "./types";
import { findBistCompany } from "./bist";

export interface WatchlistFileEntry {
  ticker: string;
  type: AssetType;
  name?: string;
}

export const WATCHLIST_FILE_PATH = path.join(process.cwd(), "watchlist.md");

export const DEFAULT_ENTRIES: WatchlistFileEntry[] = [
  { ticker: "THYAO.IS", type: "stock", name: "Türk Hava Yolları" },
  { ticker: "ASELS.IS", type: "stock", name: "Aselsan" },
  { ticker: "AAPL", type: "stock", name: "Apple Inc." },
  { ticker: "GC=F", type: "gold", name: "Ons Altın Vadeli" },
];

/**
 * Parses markdown content into a list of WatchlistFileEntry.
 * Supports markdown tables (| Ticker | Type | Name |) and bullet points (- TICKER).
 */
export function parseWatchlistMarkdown(content: string): WatchlistFileEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: WatchlistFileEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for markdown table row: | Ticker | Type | Name |
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
      const type: AssetType =
        rawType === "gold" ||
        rawType === "altin" ||
        rawType === "altın" ||
        ticker.includes("GC=F") ||
        ticker === "ALTIN"
          ? "gold"
          : "stock";

      const bist = findBistCompany(ticker);
      const name = parts[2]?.trim() || bist?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);

      if (!seen.has(ticker)) {
        seen.add(ticker);
        entries.push({ ticker, type, name });
      }
      continue;
    }

    // Fallback: bullet points like "- THYAO.IS" or "- THYAO.IS (stock) - Türk Hava Yolları"
    const bulletMatch = line.match(/^[-*]\s*([A-Za-z0-9.=_-]+)(?:\s*\(([^)]+)\))?(?:\s*[-–]\s*(.+))?$/);
    if (bulletMatch) {
      const ticker = bulletMatch[1].trim().toUpperCase();
      if (!ticker) continue;

      const hint = (bulletMatch[2] || "").toLowerCase().trim();
      const extraName = bulletMatch[3]?.trim();
      const type: AssetType =
        hint === "gold" || hint === "altin" || hint === "altın" || ticker.includes("GC=F")
          ? "gold"
          : "stock";
      const bist = findBistCompany(ticker);
      const name = extraName || bist?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);

      if (!seen.has(ticker)) {
        seen.add(ticker);
        entries.push({ ticker, type, name });
      }
    }
  }

  return entries.length > 0 ? entries : DEFAULT_ENTRIES;
}

/**
 * Serializes WatchlistFileEntry array into clean Markdown table format.
 */
export function formatWatchlistMarkdown(entries: WatchlistFileEntry[]): string {
  const rows = entries.map((e) => {
    const bist = findBistCompany(e.ticker);
    const displayName = e.name || bist?.name || (e.type === "gold" ? "Ons Altın Vadeli" : "");
    return `| ${e.ticker} | ${e.type} | ${displayName} |`;
  });

  return `# Takip Listesi

Bu dosya Finans Asistanı takip listesindeki varlıkları içerir.
Arayüz üzerinden veya doğrudan bu dosya düzenlenerek varlık eklenip çıkarılabilir.

| Sembol | Tür | Ad |
| --- | --- | --- |
${rows.join("\n")}
`;
}

/**
 * Reads watchlist from watchlist.md. Creates default file if not found.
 */
export async function getWatchlistFromFile(): Promise<WatchlistFileEntry[]> {
  try {
    const content = await fs.readFile(WATCHLIST_FILE_PATH, "utf-8");
    return parseWatchlistMarkdown(content);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveWatchlistToFile(DEFAULT_ENTRIES);
      return DEFAULT_ENTRIES;
    }
    console.error("[watchlist-storage] Okuma hatası:", err);
    return DEFAULT_ENTRIES;
  }
}

/**
 * Saves given list to watchlist.md.
 */
export async function saveWatchlistToFile(entries: WatchlistFileEntry[]): Promise<void> {
  const content = formatWatchlistMarkdown(entries);
  await fs.writeFile(WATCHLIST_FILE_PATH, content, "utf-8");
}

/**
 * Adds an entry to watchlist.md if not already present.
 */
export async function addWatchEntryToFile(entry: WatchlistFileEntry): Promise<WatchlistFileEntry[]> {
  const current = await getWatchlistFromFile();
  const normalizedTicker = entry.ticker.trim().toUpperCase();

  const existingIndex = current.findIndex((e) => e.ticker.toUpperCase() === normalizedTicker);
  if (existingIndex >= 0) {
    return current;
  }

  const updated = [...current, { ...entry, ticker: normalizedTicker }];
  await saveWatchlistToFile(updated);
  return updated;
}

/**
 * Removes an entry from watchlist.md by ticker.
 */
export async function removeWatchEntryFromFile(ticker: string): Promise<WatchlistFileEntry[]> {
  const current = await getWatchlistFromFile();
  const normalizedTicker = ticker.trim().toUpperCase();
  const updated = current.filter((e) => e.ticker.toUpperCase() !== normalizedTicker);
  await saveWatchlistToFile(updated);
  return updated;
}

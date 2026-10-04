import type { AssetType } from "./types";

export interface WatchEntry {
  ticker: string;
  type: AssetType;
}

export const WATCHLIST: readonly WatchEntry[] = [
  { ticker: "THYAO.IS", type: "stock" },
  { ticker: "ASELS.IS", type: "stock" },
  { ticker: "AAPL", type: "stock" },
  { ticker: "GC=F", type: "gold" },
] as const;

export function findWatchEntry(ticker: string): WatchEntry | undefined {
  return WATCHLIST.find((w) => w.ticker === ticker);
}

export function resolveType(ticker: string, hint?: string | null): AssetType {
  if (hint === "gold" || hint === "stock") return hint;
  return findWatchEntry(ticker)?.type ?? "stock";
}

export function decodeTicker(raw: string): string {
  return decodeURIComponent(raw).toUpperCase();
}

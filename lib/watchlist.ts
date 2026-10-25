import type { AssetType } from "./types";
import type { TimeframeKey } from "./timeframes";

export interface WatchEntry {
  ticker: string;
  type: AssetType;
  name?: string;
  timeframe?: TimeframeKey;
}

export const DEFAULT_WATCHLIST: readonly WatchEntry[] = [
  { ticker: "THYAO.IS", type: "stock" },
  { ticker: "ASELS.IS", type: "stock" },
  { ticker: "AAPL", type: "stock" },
  { ticker: "GC=F", type: "gold" },
] as const;

export const WATCHLIST: readonly WatchEntry[] = DEFAULT_WATCHLIST;

export function findWatchEntry(ticker: string): WatchEntry | undefined {
  return WATCHLIST.find((w) => w.ticker === ticker);
}

import { detectAssetCategory } from "./markets";

export function resolveType(ticker: string, hint?: string | null): AssetType {
  if (hint && ["stock", "gold", "commodity", "forex", "crypto", "us_stock"].includes(hint)) {
    return hint as AssetType;
  }
  return detectAssetCategory(ticker);
}

export function decodeTicker(raw: string): string {
  return decodeURIComponent(raw).toUpperCase();
}

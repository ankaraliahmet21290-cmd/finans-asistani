import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { resolveType } from "@/lib/watchlist";
import type { TimeframeKey } from "@/lib/types";

import { findBistCompany } from "@/lib/bist";

export const dynamic = "force-dynamic";

const VALID_TIMEFRAMES = new Set<TimeframeKey>([
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker parametresi gerekli" }, { status: 400 });
  }

  // Normalize TradingView or BIST formats:
  // e.g. "BIST:THYAO" -> "THYAO.IS", "THYAO" -> "THYAO.IS"
  if (ticker.startsWith("BIST:")) {
    ticker = ticker.replace(/^BIST:/i, "");
  }
  if (ticker === "FX:USDTRY") ticker = "USDTRY=X";
  if (ticker === "FX:EURTRY") ticker = "EURTRY=X";
  if (ticker === "OANDA:XAUUSD") ticker = "GC=F";
  if (ticker.startsWith("BINANCE:") && ticker.endsWith("USDT")) {
    ticker = ticker.replace("BINANCE:", "").replace("USDT", "-USD");
  }

  const bist = findBistCompany(ticker);
  if (bist) {
    ticker = bist.ticker;
  } else if (!ticker.includes(".") && !ticker.includes("=") && !ticker.includes("-") && /^[A-Z]{4,5}$/.test(ticker)) {
    // If it looks like a Turkish ticker
    ticker = `${ticker}.IS`;
  }

  const type = resolveType(ticker, searchParams.get("type"));
  const tfParam = (searchParams.get("timeframe") || searchParams.get("tf") || "1d") as TimeframeKey;
  const timeframe: TimeframeKey = VALID_TIMEFRAMES.has(tfParam) ? tfParam : "1d";

  try {
    const result = await analyzeSymbol(ticker, type, timeframe);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[analyze] hata:", ticker, e);
    return NextResponse.json(
      { ticker, error: e instanceof Error ? e.message : "Veri alınamadı" },
      { status: 502 }
    );
  }
}

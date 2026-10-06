import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { resolveType } from "@/lib/watchlist";
import type { TimeframeKey } from "@/lib/types";

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
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker parametresi gerekli" }, { status: 400 });
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

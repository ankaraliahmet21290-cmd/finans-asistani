import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { resolveType } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker parametresi gerekli" }, { status: 400 });
  }

  const type = resolveType(ticker, searchParams.get("type"));

  try {
    const result = await analyzeSymbol(ticker, type);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[analyze] hata:", ticker, e);
    return NextResponse.json(
      { ticker, error: e instanceof Error ? e.message : "Veri alınamadı" },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  getWatchlistFromFile,
  addWatchEntryToFile,
  removeWatchEntryFromFile,
} from "@/lib/watchlist-storage";
import { findBistCompany } from "@/lib/bist";
import type { AssetType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getWatchlistFromFile();
    return NextResponse.json({ ok: true, watchlist: list });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Liste okunamadı" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawTicker = String(body.ticker || "").trim().toUpperCase();

    if (!rawTicker) {
      return NextResponse.json(
        { ok: false, error: "Lütfen geçerli bir hisse veya sembol kodu girin." },
        { status: 400 }
      );
    }

    // If ticker matches BIST company code (e.g. "GARAN"), convert to ticker ("GARAN.IS")
    const bist = findBistCompany(rawTicker);
    let ticker = rawTicker;
    if (bist && !ticker.endsWith(".IS")) {
      ticker = bist.ticker;
    }

    const type: AssetType =
      body.type === "gold" ||
      ticker.includes("GC=F") ||
      ticker === "ALTIN" ||
      ticker.includes("GLD")
        ? "gold"
        : "stock";

    const name = body.name || bist?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);

    const updated = await addWatchEntryToFile({ ticker, type, name });
    return NextResponse.json({
      ok: true,
      watchlist: updated,
      added: { ticker, type, name },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sembol eklenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let ticker = url.searchParams.get("ticker");

    if (!ticker) {
      const body = await req.json().catch(() => ({}));
      ticker = body.ticker;
    }

    if (!ticker) {
      return NextResponse.json(
        { ok: false, error: "Silinecek sembol belirtilmedi." },
        { status: 400 }
      );
    }

    const updated = await removeWatchEntryFromFile(ticker);
    return NextResponse.json({
      ok: true,
      watchlist: updated,
      removed: ticker,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sembol silinemedi" },
      { status: 500 }
    );
  }
}

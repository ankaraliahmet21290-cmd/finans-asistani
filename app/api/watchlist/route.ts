import { NextResponse } from "next/server";
import {
  getWatchlistFromFile,
  addWatchEntryToFile,
  removeWatchEntryFromFile,
  updateWatchEntryTimeframeToFile,
} from "@/lib/watchlist-storage";
import { findBistCompany } from "@/lib/bist";
import { detectAssetCategory, CURATED_MARKET_ITEMS } from "@/lib/markets";
import { normalizeTimeframeKey, type TimeframeKey } from "@/lib/timeframe-settings-storage";
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
      ["gold", "crypto", "forex", "commodity", "us_stock", "stock"].includes(body.type)
        ? (body.type as AssetType)
        : (detectAssetCategory(ticker) as AssetType);

    const curated = CURATED_MARKET_ITEMS[ticker];
    const name = body.name || bist?.name || curated?.name || (type === "gold" ? "Ons Altın Vadeli" : undefined);
    const timeframe: TimeframeKey = body.timeframe ? normalizeTimeframeKey(body.timeframe) : "1d";

    const updated = await addWatchEntryToFile({ ticker, type, name, timeframe });
    return NextResponse.json({
      ok: true,
      watchlist: updated,
      added: { ticker, type, name, timeframe },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sembol eklenemedi" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const ticker = String(body.ticker || "").trim().toUpperCase();
    const timeframe: TimeframeKey = normalizeTimeframeKey(body.timeframe);

    if (!ticker) {
      return NextResponse.json(
        { ok: false, error: "Güncellenecek sembol belirtilmedi." },
        { status: 400 }
      );
    }

    const updated = await updateWatchEntryTimeframeToFile(ticker, timeframe);
    return NextResponse.json({
      ok: true,
      watchlist: updated,
      updated: { ticker, timeframe },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Periyot güncellenemedi" },
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

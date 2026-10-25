import { NextResponse } from "next/server";
import {
  getWatchlistSettingsFromFile,
  saveWatchlistSettingsToFile,
  WATCHLIST_INTERVAL_OPTIONS,
  normalizeWatchlistCheckInterval,
  type WatchlistCheckInterval,
} from "@/lib/watchlist-storage";
import { ensureSchedulerStarted } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  try {
    const settings = await getWatchlistSettingsFromFile();
    return NextResponse.json({
      ok: true,
      settings,
      options: WATCHLIST_INTERVAL_OPTIONS,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Ayarlar yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  ensureSchedulerStarted();
  try {
    const body = await req.json();
    const { checkInterval, onlyTradingHours } = body;

    const updates: { checkInterval?: WatchlistCheckInterval; onlyTradingHours?: boolean } = {};

    if (checkInterval !== undefined) {
      updates.checkInterval = normalizeWatchlistCheckInterval(checkInterval);
    }
    if (onlyTradingHours !== undefined) {
      updates.onlyTradingHours = Boolean(onlyTradingHours);
    }

    const updated = await saveWatchlistSettingsToFile(updates);
    return NextResponse.json({
      ok: true,
      settings: updated,
      options: WATCHLIST_INTERVAL_OPTIONS,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

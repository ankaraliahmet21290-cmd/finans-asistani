import { NextResponse } from "next/server";
import {
  getTimeframeSettingsFromFile,
  saveTimeframeSettingsToFile,
  normalizeTimeframeKey,
  type TimeframeSettingsConfig,
} from "@/lib/timeframe-settings-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getTimeframeSettingsFromFile();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar okunamadı" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updates: Partial<TimeframeSettingsConfig> = {};

    if (body.panel === "watchlist" && body.timeframe) {
      updates.watchlist = normalizeTimeframeKey(body.timeframe);
    } else if (body.panel === "topSignals" && body.timeframe) {
      updates.topSignals = normalizeTimeframeKey(body.timeframe);
    } else if (body.panel === "all" && body.timeframe) {
      updates.watchlist = normalizeTimeframeKey(body.timeframe);
      updates.topSignals = normalizeTimeframeKey(body.timeframe);
    }

    if (body.watchlist) {
      updates.watchlist = normalizeTimeframeKey(body.watchlist);
    }
    if (body.topSignals) {
      updates.topSignals = normalizeTimeframeKey(body.topSignals);
    }

    const saved = await saveTimeframeSettingsToFile(updates);
    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

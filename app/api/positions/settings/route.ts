import { NextResponse } from "next/server";
import {
  INTERVAL_TO_MINUTES,
  loadPositionsFile,
  normalizeCheckInterval,
  savePositionsFile,
} from "@/lib/position-storage";
import type { PositionCheckInterval } from "@/lib/position-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings } = await loadPositionsFile();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ayarlar yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { checkInterval, onlyTradingHours } = body;

    const { settings, positions } = await loadPositionsFile();

    if (checkInterval !== undefined) {
      const normalized: PositionCheckInterval = normalizeCheckInterval(checkInterval);
      settings.checkInterval = normalized;
      settings.intervalMinutes = INTERVAL_TO_MINUTES[normalized];
    }

    if (onlyTradingHours !== undefined) {
      settings.onlyTradingHours = Boolean(onlyTradingHours);
    }

    await savePositionsFile(settings, positions);

    return NextResponse.json({
      ok: true,
      message: `Tarama aralığı '${settings.checkInterval}' olarak portfoy-takip.md dosyasına kaydedildi`,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

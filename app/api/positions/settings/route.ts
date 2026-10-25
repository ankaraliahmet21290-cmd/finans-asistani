import { NextResponse } from "next/server";
import {
  INTERVAL_TO_MINUTES,
  DEFAULT_POSITION_SETTINGS,
  loadPositionsFile,
  normalizeCheckInterval,
  savePositionsFile,
} from "@/lib/position-storage";
import type {
  PositionCheckInterval,
  PositionMarketScope,
  PositionMarketIntervals,
} from "@/lib/position-types";

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
    const { checkInterval, onlyTradingHours, market, markets } = body;

    const { settings, positions } = await loadPositionsFile();
    settings.markets = {
      ...DEFAULT_POSITION_SETTINGS.markets!,
      ...(settings.markets || {}),
    };

    if (market && checkInterval !== undefined) {
      const normalized: PositionCheckInterval = normalizeCheckInterval(checkInterval);
      const m = market as PositionMarketScope;
      if (m === "bist") settings.markets.bist = normalized;
      else if (m === "crypto") settings.markets.crypto = normalized;
      else if (m === "commodity_forex") settings.markets.commodity_forex = normalized;
      else if (m === "us_stocks") settings.markets.us_stocks = normalized;
    } else if (checkInterval !== undefined) {
      const normalized: PositionCheckInterval = normalizeCheckInterval(checkInterval);
      settings.checkInterval = normalized;
      settings.intervalMinutes = INTERVAL_TO_MINUTES[normalized];
    }

    if (markets !== undefined && typeof markets === "object") {
      Object.assign(settings.markets, markets);
    }

    if (onlyTradingHours !== undefined) {
      settings.onlyTradingHours = Boolean(onlyTradingHours);
    }

    await savePositionsFile(settings, positions);

    return NextResponse.json({
      ok: true,
      message: market
        ? `${market} alarm sıklığı güncellendi`
        : `Tarama aralığı '${settings.checkInterval}' olarak kaydedildi`,
      settings,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

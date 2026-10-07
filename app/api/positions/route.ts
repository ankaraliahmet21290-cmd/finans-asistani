import { NextResponse } from "next/server";
import {
  loadPositionsFile,
  savePositionsFile,
} from "@/lib/position-storage";
import type { PositionEntry, PositionStatus } from "@/lib/position-types";
import { getCandles } from "@/lib/data";
import { findBistCompany } from "@/lib/bist";
import { normalizeTimeframeKey, type TimeframeKey } from "@/lib/timeframes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings, positions } = await loadPositionsFile();

    // Enrich positions with real-time price and metrics
    const enrichedPositions: PositionEntry[] = await Promise.all(
      positions.map(async (pos) => {
        try {
          const res = await getCandles(pos.ticker, pos.timeframe);
          const currentPrice =
            res.regularMarketPrice ?? res.closes.at(-1) ?? pos.entryPrice;
          const prevClose = res.previousClose ?? res.closes.at(-2) ?? currentPrice;
          const changePercent =
            prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

          const profitLossPercent =
            pos.entryPrice > 0
              ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
              : 0;

          const distanceToStopPercent =
            currentPrice > 0
              ? ((currentPrice - pos.stopLoss) / currentPrice) * 100
              : 0;

          const distanceToTargetPercent =
            currentPrice > 0
              ? ((pos.takeProfit - currentPrice) / currentPrice) * 100
              : 0;

          return {
            ...pos,
            currentPrice,
            changePercent: Math.round(changePercent * 100) / 100,
            profitLossPercent: Math.round(profitLossPercent * 100) / 100,
            distanceToStopPercent: Math.round(distanceToStopPercent * 100) / 100,
            distanceToTargetPercent: Math.round(distanceToTargetPercent * 100) / 100,
          };
        } catch {
          return {
            ...pos,
            currentPrice: pos.entryPrice,
            changePercent: 0,
            profitLossPercent: 0,
            distanceToStopPercent: 0,
            distanceToTargetPercent: 0,
          };
        }
      })
    );

    return NextResponse.json({
      settings,
      positions: enrichedPositions,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pozisyonlar yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ticker,
      timeframe = "1h",
      entryPrice,
      stopLoss,
      takeProfit,
      notes,
    } = body;

    if (!ticker) {
      return NextResponse.json({ error: "Sembol zorunludur" }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    const bist = findBistCompany(cleanTicker);
    const code = bist ? bist.code : cleanTicker.replace(/\.IS$/, "");
    const name = bist ? bist.name : code;
    const tf: TimeframeKey = normalizeTimeframeKey(timeframe);

    // If entryPrice, stopLoss or takeProfit not provided, compute them from current price & ATR
    const candleRes = await getCandles(cleanTicker, tf);
    const currentPrice =
      entryPrice ?? candleRes.regularMarketPrice ?? candleRes.closes.at(-1) ?? 100;

    const { settings, positions } = await loadPositionsFile();

    const id = `pos_${cleanTicker.replace(/[^A-Za-z0-9]/g, "")}_${tf}_${Date.now()}`;
    const newPos: PositionEntry = {
      id,
      ticker: cleanTicker,
      code,
      name,
      timeframe: tf,
      entryPrice: Number(currentPrice),
      entryDate: new Date().toISOString().slice(0, 10),
      stopLoss: Number(stopLoss ?? currentPrice * 0.95),
      takeProfit: Number(takeProfit ?? currentPrice * 1.08),
      status: "active",
      notes: notes || "",
    };

    // Remove existing active position for same ticker and timeframe if any
    const filtered = positions.filter(
      (p) => !(p.ticker === cleanTicker && p.timeframe === tf)
    );
    const updated = [newPos, ...filtered];

    await savePositionsFile(settings, updated);

    return NextResponse.json({
      ok: true,
      message: `${code} pozisyonu başarıyla portfoy-takip.md dosyasına kaydedildi`,
      position: newPos,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pozisyon eklenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ticker = searchParams.get("ticker");

    if (!id && !ticker) {
      return NextResponse.json({ error: "ID veya Ticker gereklidir" }, { status: 400 });
    }

    const { settings, positions } = await loadPositionsFile();
    const updated = positions.filter((p) => {
      if (id && p.id === id) return false;
      if (ticker && p.ticker.toUpperCase() === ticker.toUpperCase()) return false;
      return true;
    });

    await savePositionsFile(settings, updated);

    return NextResponse.json({
      ok: true,
      message: "Pozisyon portfoy-takip.md dosyasından kaldırıldı",
      remainingCount: updated.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pozisyon silinemedi" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, stopLoss, takeProfit, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID gereklidir" }, { status: 400 });
    }

    const { settings, positions } = await loadPositionsFile();
    const updated = positions.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        status: (status as PositionStatus) ?? p.status,
        stopLoss: stopLoss != null ? Number(stopLoss) : p.stopLoss,
        takeProfit: takeProfit != null ? Number(takeProfit) : p.takeProfit,
        notes: notes !== undefined ? notes : p.notes,
      };
    });

    await savePositionsFile(settings, updated);

    return NextResponse.json({ ok: true, message: "Pozisyon güncellendi" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pozisyon güncellenemedi" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { loadPositionsFile, savePositionsFile } from "@/lib/position-storage";
import { getCandles } from "@/lib/data";
import { isWithinTradingHours } from "@/lib/multitimeframe";
import { sendPositionAlarmMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleCheck(req);
}

export async function POST(req: Request) {
  return handleCheck(req);
}

async function handleCheck(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const { settings, positions } = await loadPositionsFile();
    const isHours = isWithinTradingHours();

    if (!force && settings.checkInterval === "off") {
      return NextResponse.json({
        ok: true,
        checked: false,
        message: "Otomatik tarama portfoy-takip.md dosyasında kapalı.",
        alarmsSent: 0,
      });
    }

    if (!force && settings.onlyTradingHours && !isHours) {
      return NextResponse.json({
        ok: true,
        checked: false,
        withinHours: false,
        message: "BIST seans saatleri dışında (09:50 - 18:00) tarama atlandı.",
        alarmsSent: 0,
      });
    }

    const nowIso = new Date().toISOString();
    let alarmsSent = 0;
    const alarmLogs: string[] = [];

    // Filter to active positions
    const updatedPositions = await Promise.all(
      positions.map(async (pos) => {
        // Skip already closed or notified positions unless forced
        if (pos.status === "closed") {
          return pos;
        }

        try {
          const candleRes = await getCandles(pos.ticker, pos.timeframe);
          const currentPrice =
            candleRes.regularMarketPrice ??
            candleRes.closes.at(-1) ??
            pos.entryPrice;

          const profitLossPercent =
            pos.entryPrice > 0
              ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
              : 0;

          // Check STOP-LOSS
          if (
            currentPrice <= pos.stopLoss &&
            pos.notifiedType !== "stop_loss"
          ) {
            console.log(
              `[position-tracker] 🛑 STOP-LOSS TETİKLENDİ: ${pos.code} Fiyat: ${currentPrice} <= Stop: ${pos.stopLoss}`
            );
            await sendPositionAlarmMail({
              type: "stop_loss",
              position: {
                ticker: pos.ticker,
                code: pos.code,
                name: pos.name,
                timeframe: pos.timeframe,
                entryPrice: pos.entryPrice,
                currentPrice,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit,
                profitLossPercent,
                notes: pos.notes,
              },
            });

            alarmsSent++;
            alarmLogs.push(`🛑 ${pos.code} Stop-Loss tetiklendi (₺${currentPrice.toFixed(2)})`);

            return {
              ...pos,
              status: "stop_loss_hit" as const,
              notifiedAt: nowIso,
              notifiedType: "stop_loss" as const,
            };
          }

          // Check TAKE-PROFIT
          if (
            currentPrice >= pos.takeProfit &&
            pos.notifiedType !== "take_profit"
          ) {
            console.log(
              `[position-tracker] 🎯 KÂR AL TETİKLENDİ: ${pos.code} Fiyat: ${currentPrice} >= Hedef: ${pos.takeProfit}`
            );
            await sendPositionAlarmMail({
              type: "take_profit",
              position: {
                ticker: pos.ticker,
                code: pos.code,
                name: pos.name,
                timeframe: pos.timeframe,
                entryPrice: pos.entryPrice,
                currentPrice,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit,
                profitLossPercent,
                notes: pos.notes,
              },
            });

            alarmsSent++;
            alarmLogs.push(`🎯 ${pos.code} Kâr Al hedefine ulaştı (₺${currentPrice.toFixed(2)})`);

            return {
              ...pos,
              status: "take_profit_hit" as const,
              notifiedAt: nowIso,
              notifiedType: "take_profit" as const,
            };
          }

          return pos;
        } catch (e) {
          console.error(`[position-tracker] ${pos.ticker} fiyat alınamadı:`, e);
          return pos;
        }
      })
    );

    // Update settings metadata
    settings.lastCheckAt = nowIso;
    if (alarmsSent > 0) {
      settings.lastAlarmSentAt = nowIso;
      settings.totalAlarmsSent += alarmsSent;
    }

    // Save back to portfoy-takip.md
    await savePositionsFile(settings, updatedPositions);

    return NextResponse.json({
      ok: true,
      checked: true,
      withinHours: isHours,
      totalPositions: positions.length,
      alarmsSent,
      alarmLogs,
      message:
        alarmsSent > 0
          ? `${alarmsSent} adet pozisyon alarmı e-posta ile gönderildi!`
          : "Pozisyonlar kontrol edildi; stop veya hedef seviyesine ulaşan hisse bulunmuyor.",
      lastCheckAt: nowIso,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pozisyon kontrolü başarısız" },
      { status: 500 }
    );
  }
}

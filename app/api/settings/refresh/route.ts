import { NextResponse } from "next/server";
import {
  getRefreshSettingsFromFile,
  saveRefreshSettingsToFile,
  REFRESH_INTERVAL_OPTIONS,
  type RefreshInterval,
} from "@/lib/refresh-settings-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const config = await getRefreshSettingsFromFile();
    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market") as "bist" | "crypto" | "commodity_forex" | "us_stocks" | null;

    let effectiveSeconds = config.seconds;
    if (market && config.markets?.[market] !== undefined) {
      effectiveSeconds = config.markets[market];
    }

    return NextResponse.json({
      ok: true,
      config,
      options: REFRESH_INTERVAL_OPTIONS,
      effectiveSeconds,
      market: market ?? null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/settings/refresh] GET hatası:", err);
    return NextResponse.json(
      { ok: false, error: `Ayar okunamadı: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawSeconds = body.seconds ?? body.interval ?? body.value;
    const market = body.market as "bist" | "crypto" | "commodity_forex" | "us_stocks" | undefined;

    if (rawSeconds === undefined || rawSeconds === null) {
      return NextResponse.json(
        { ok: false, error: "Geçerli bir yenileme süresi belirtilmedi." },
        { status: 400 }
      );
    }

    const updatedConfig = await saveRefreshSettingsToFile({
      seconds: rawSeconds as RefreshInterval,
      market,
    });

    return NextResponse.json({
      ok: true,
      message: market
        ? `${market.toUpperCase()} veri yenileme sıklığı kaydedildi.`
        : `Veri yenileme sıklığı "${updatedConfig.label}" olarak güncellendi ve refresh-settings.md dosyasına kaydedildi.`,
      config: updatedConfig,
      market,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/settings/refresh] POST hatası:", err);
    return NextResponse.json(
      { ok: false, error: `Ayar kaydedilemedi: ${error}` },
      { status: 500 }
    );
  }
}

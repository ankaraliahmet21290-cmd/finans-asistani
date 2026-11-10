import { NextRequest, NextResponse } from "next/server";
import {
  clearAnalyticsData,
  getAnalyticsSummary,
  getClientIp,
  parseDevice,
  recordAnalyticsEvent,
  resolveGeoIp,
  seedDemoAnalyticsData,
} from "@/lib/analytics-storage";
import type { AnalyticsTimeframe } from "@/lib/analytics-types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframeParam = searchParams.get("timeframe") as AnalyticsTimeframe | null;
    const timeframe: AnalyticsTimeframe =
      timeframeParam && ["realtime", "hourly", "weekly", "monthly", "all"].includes(timeframeParam)
        ? timeframeParam
        : "hourly";

    const filterIp = searchParams.get("ip") || undefined;
    const filterScreen = searchParams.get("screen") || undefined;

    const summary = await getAnalyticsSummary(timeframe, filterIp, filterScreen);
    const clientIp = getClientIp(req.headers);
    const clientGeo = await resolveGeoIp(clientIp, req.headers);

    return NextResponse.json({
      ok: true,
      clientIp,
      clientGeo,
      summary,
    });
  } catch (error) {
    console.error("[api/analytics/stats] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "seed") {
      await seedDemoAnalyticsData();
      return NextResponse.json({ ok: true, message: "Demo verileri başarıyla yüklendi" });
    }

    if (action === "test_event") {
      // Simulate or record a test event with client's IP
      const ip = getClientIp(req.headers);
      const userAgent = req.headers.get("user-agent") || undefined;
      const device = parseDevice(userAgent);
      const geo = await resolveGeoIp(ip, req.headers);

      const screens = [
        { name: "BIST Hisseleri (Ana Sayfa)", path: "/" },
        { name: "Kripto Varlıklar", path: "/kripto" },
        { name: "Emtia & Döviz", path: "/emtia-doviz" },
        { name: "ABD Borsası (Nasdaq/S&P)", path: "/abd-borsasi" },
        { name: "Hisse Detay: THYAO", path: "/symbol/THYAO" },
      ];
      const randomScreen = screens[Math.floor(Math.random() * screens.length)];

      const evt = await recordAnalyticsEvent({
        ip,
        city: geo.city,
        country: geo.country,
        countryCode: geo.countryCode,
        screen: body.screen || randomScreen.name,
        path: body.path || randomScreen.path,
        action: "click",
        label: body.label || "Test Simülasyon Tıklaması",
        userAgent,
        device,
      });

      return NextResponse.json({ ok: true, event: evt });
    }

    return NextResponse.json({ ok: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    console.error("[api/analytics/stats] POST Error:", error);
    return NextResponse.json({ ok: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearAnalyticsData();
    return NextResponse.json({ ok: true, message: "Tüm analiz verileri temizlendi" });
  } catch (error) {
    console.error("[api/analytics/stats] DELETE Error:", error);
    return NextResponse.json({ ok: false, error: "Veriler temizlenemedi" }, { status: 500 });
  }
}

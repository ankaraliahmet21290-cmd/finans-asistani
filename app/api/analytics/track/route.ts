import { NextRequest, NextResponse } from "next/server";
import { getClientIp, parseDevice, recordAnalyticsEvent, resolveGeoIp } from "@/lib/analytics-storage";
import type { AnalyticsAction } from "@/lib/analytics-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || undefined;
    const device = parseDevice(userAgent);
    const geo = await resolveGeoIp(ip, req.headers);

    const screen = typeof body.screen === "string" && body.screen.trim() ? body.screen.trim() : "Bilinmeyen Ekran";
    const path = typeof body.path === "string" && body.path.trim() ? body.path.trim() : "/";
    const action: AnalyticsAction = body.action === "click" ? "click" : "page_view";
    const label = typeof body.label === "string" ? body.label : undefined;

    const event = await recordAnalyticsEvent({
      ip,
      city: geo.city,
      country: geo.country,
      countryCode: geo.countryCode,
      screen,
      path,
      action,
      label,
      userAgent,
      device,
    });

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error("[api/analytics/track] Error:", error);
    return NextResponse.json({ ok: false, error: "Tracking failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Simple ping endpoint that returns client's detected IP
  const ip = getClientIp(req.headers);
  return NextResponse.json({ ok: true, ip });
}

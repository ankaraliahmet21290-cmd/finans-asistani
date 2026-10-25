import { NextResponse } from "next/server";
import {
  saveMailSettingsToFile,
  MAIL_INTERVAL_OPTIONS,
  type MailIntervalKey,
} from "@/lib/mail-settings-storage";
import {
  ensureSchedulerStarted,
  getSchedulerState,
  syncSchedulerWithConfig,
} from "@/lib/scheduler";
import { isMailConfigured, getMailProvider } from "@/lib/mail";
import { getRecipientsFromFile } from "@/lib/mail-recipients-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  ensureSchedulerStarted();
  const config = await syncSchedulerWithConfig();
  const scheduler = getSchedulerState();
  const recipients = await getRecipientsFromFile();
  const activeRecipients = recipients.filter((r) => r.enabled).map((r) => r.email);

  const { searchParams } = new URL(req.url);
  const market = searchParams.get("market") as "bist" | "crypto" | "commodity_forex" | "us_stocks" | null;

  let effectiveIntervalKey = config.intervalKey;
  if (market && config.markets?.[market]) {
    effectiveIntervalKey = config.markets[market];
  }

  return NextResponse.json({
    ok: true,
    config,
    options: MAIL_INTERVAL_OPTIONS,
    scheduler,
    market: market ?? null,
    effectiveIntervalKey,
    mail: {
      configured: isMailConfigured(),
      provider: getMailProvider(),
      recipient: activeRecipients[0] || process.env.MAIL_TO || process.env.GMAIL_USER || null,
      activeRecipientsCount: activeRecipients.length,
      totalRecipientsCount: recipients.length,
      activeEmails: activeRecipients,
    },
  });
}

export async function POST(req: Request) {
  try {
    ensureSchedulerStarted();
    const body = await req.json();

    const { intervalKey, enabled, onlyTradingHours, market } = body as {
      intervalKey?: MailIntervalKey;
      enabled?: boolean;
      onlyTradingHours?: boolean;
      market?: "bist" | "crypto" | "commodity_forex" | "us_stocks";
    };

    const updatedConfig = await saveMailSettingsToFile({
      intervalKey,
      enabled,
      onlyTradingHours,
      market,
    });

    await syncSchedulerWithConfig();
    const scheduler = getSchedulerState();

    return NextResponse.json({
      ok: true,
      message: market
        ? `${market.toUpperCase()} tarama sıklığı kaydedildi.`
        : `E-posta sıklığı "${updatedConfig.label}" olarak güncellendi ve mail-settings.md dosyasına kaydedildi.`,
      config: updatedConfig,
      scheduler,
      market,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/mail/settings] POST hatası:", err);
    return NextResponse.json(
      { ok: false, error: `Ayar kaydedilemedi: ${error}` },
      { status: 500 }
    );
  }
}

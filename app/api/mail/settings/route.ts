import { NextResponse } from "next/server";
import {
  getMailSettingsFromFile,
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

export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const config = await syncSchedulerWithConfig();
  const scheduler = getSchedulerState();

  return NextResponse.json({
    ok: true,
    config,
    options: MAIL_INTERVAL_OPTIONS,
    scheduler,
    mail: {
      configured: isMailConfigured(),
      provider: getMailProvider(),
      recipient: process.env.MAIL_TO || process.env.GMAIL_USER || null,
    },
  });
}

export async function POST(req: Request) {
  try {
    ensureSchedulerStarted();
    const body = await req.json();

    const { intervalKey, enabled, onlyTradingHours } = body as {
      intervalKey?: MailIntervalKey;
      enabled?: boolean;
      onlyTradingHours?: boolean;
    };

    const updatedConfig = await saveMailSettingsToFile({
      intervalKey,
      enabled,
      onlyTradingHours,
    });

    await syncSchedulerWithConfig();
    const scheduler = getSchedulerState();

    return NextResponse.json({
      ok: true,
      message: `E-posta sıklığı "${updatedConfig.label}" olarak güncellendi ve mail-settings.md dosyasına kaydedildi.`,
      config: updatedConfig,
      scheduler,
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

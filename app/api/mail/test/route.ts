import { NextResponse } from "next/server";
import { getMailProvider, isMailConfigured, sendSignalMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getMailProvider();
  if (!provider || !isMailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "E-posta ayarları eksik. Lütfen .env.local dosyanızda GMAIL_USER ve GMAIL_APP_PASSWORD değerlerini tanımlayın.",
      },
      { status: 400 }
    );
  }

  try {
    const success = await sendSignalMail([
      {
        ticker: "THYAO.IS",
        signal: "AL",
        score: 0.65,
        price: 312.5,
        reasons: [
          "RSI(14) 28.5 < 30 → aşırı satım bölgesinden dönüş",
          "Golden Cross: SMA50, SMA200'ü yukarı kesti",
          "F/K 4.8 → sektör ortalamasının altında, ucuz",
        ],
      },
    ]);

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "E-posta gönderimi başarısız oldu." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      recipient: process.env.MAIL_TO || process.env.GMAIL_USER,
      message: "Test sinyal e-postası başarıyla gönderildi!",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        error: e instanceof Error ? e.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}

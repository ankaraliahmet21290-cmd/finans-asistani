import { NextResponse } from "next/server";
import { getMailProvider, isMailConfigured, sendSignalMail, resolveRecipients } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const provider = getMailProvider();
  if (!provider || !isMailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "E-posta sağlayıcı ayarları eksik. Lütfen .env.local dosyanızda GMAIL_USER ve GMAIL_APP_PASSWORD değerlerini tanımlayın.",
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetEmail = searchParams.get("email");
  const recipients = await resolveRecipients(targetEmail ? [targetEmail] : undefined);

  if (recipients.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Gönderilecek aktif alıcı bulunamadı. Lütfen mail-recipients.md dosyasına veya arayüzden en az bir alıcı ekleyin.",
      },
      { status: 400 }
    );
  }

  try {
    const success = await sendSignalMail(
      [
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
      ],
      recipients
    );

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "E-posta gönderimi başarısız oldu." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      recipients,
      recipientsCount: recipients.length,
      message: `Test e-postası ${recipients.length} alıcıya başarıyla gönderildi: ${recipients.join(", ")}`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        recipients,
        error: e instanceof Error ? e.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}


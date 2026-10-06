import { NextResponse } from "next/server";
import {
  getRecipientsFromFile,
  addRecipientToFile,
  removeRecipientFromFile,
  toggleRecipientStatus,
  isValidEmail,
  RECIPIENTS_FILE_PATH,
} from "@/lib/mail-recipients-storage";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recipients = await getRecipientsFromFile(true);
    const activeEmails = recipients.filter((r) => r.enabled).map((r) => r.email);

    return NextResponse.json({
      ok: true,
      recipients,
      activeEmails,
      totalCount: recipients.length,
      activeCount: activeEmails.length,
      fileName: path.basename(RECIPIENTS_FILE_PATH),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/mail/recipients] GET hatası:", err);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, enabled } = body as {
      email?: string;
      name?: string;
      enabled?: boolean;
    };

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Geçerli bir e-posta adresi giriniz." },
        { status: 400 }
      );
    }

    const updated = await addRecipientToFile({
      email,
      name,
      enabled: enabled !== undefined ? enabled : true,
    });

    const activeEmails = updated.filter((r) => r.enabled).map((r) => r.email);

    return NextResponse.json({
      ok: true,
      message: `"${email}" mail-recipients.md dosyasına kaydedildi.`,
      recipients: updated,
      activeEmails,
      totalCount: updated.length,
      activeCount: activeEmails.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/mail/recipients] POST hatası:", err);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let email: string | null = null;

    // Check query param first
    const url = new URL(req.url);
    email = url.searchParams.get("email");

    // If not in query, check json body
    if (!email) {
      try {
        const body = await req.json();
        email = body.email;
      } catch {
        // ignore body parse error
      }
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Silinecek e-posta adresi belirtilmedi." },
        { status: 400 }
      );
    }

    const updated = await removeRecipientFromFile(email);
    const activeEmails = updated.filter((r) => r.enabled).map((r) => r.email);

    return NextResponse.json({
      ok: true,
      message: `"${email}" mail-recipients.md dosyasından kaldırıldı.`,
      recipients: updated,
      activeEmails,
      totalCount: updated.length,
      activeCount: activeEmails.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/mail/recipients] DELETE hatası:", err);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { email, enabled, name } = body as {
      email?: string;
      enabled?: boolean;
      name?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Güncellenecek e-posta adresi belirtilmedi." },
        { status: 400 }
      );
    }

    const updated = await toggleRecipientStatus(
      email,
      enabled !== undefined ? enabled : true,
      name
    );

    const activeEmails = updated.filter((r) => r.enabled).map((r) => r.email);

    return NextResponse.json({
      ok: true,
      message: `"${email}" durumu güncellendi (mail-recipients.md).`,
      recipients: updated,
      activeEmails,
      totalCount: updated.length,
      activeCount: activeEmails.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[api/mail/recipients] PATCH hatası:", err);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

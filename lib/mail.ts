import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { SignalMailItem } from "./types";

const RISK_NOTE =
  "Bu e-posta bir karar destek çıktısıdır, yatırım tavsiyesi değildir. Sinyaller geçmiş veriye dayanır ve kâr garantisi vermez.";

export function getMailProvider(): "gmail" | "resend" | null {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return "gmail";
  }
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }
  return null;
}

export function isMailConfigured(): boolean {
  const provider = getMailProvider();
  if (!provider) return false;
  const to = process.env.MAIL_TO || (provider === "gmail" ? process.env.GMAIL_USER : undefined);
  return Boolean(to);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function formatMailContent(items: SignalMailItem[], baseUrl: string) {
  const subject = `Sinyal Değişimi: ${items.map((i) => `${i.ticker} ${i.signal}`).join(", ")}`;

  const text = items
    .map((i) => {
      const link = `${baseUrl}/symbol/${encodeURIComponent(i.ticker)}`;
      return `${i.ticker}: ${i.signal} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})
Fiyat: ${i.price.toFixed(2)}
Tetikleyen Göstergeler:
${i.reasons.map((r) => `  - ${r}`).join("\n")}
Detay: ${link}
`;
    })
    .join("\n----------------------------------------\n\n") +
    `\n\n${RISK_NOTE}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; }
    .header { background: #09090b; color: #fafafa; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #a1a1aa; }
    .content { padding: 24px; }
    .item-card { border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; }
    .badge-AL { background: #dcfce7; color: #15803d; }
    .badge-SAT { background: #fee2e2; color: #b91c1c; }
    .badge-TUT { background: #f3f4f6; color: #4b5563; }
    .price { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .reasons { margin: 8px 0 12px; padding-left: 20px; font-size: 13px; color: #4b5563; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; }
    .footer { padding: 16px 24px; background: #fafafa; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Finans Asistanı · Sinyal Bildirimi</h2>
      <p>Takip listesindeki varlıklarda yeni sinyal değişimi tespit edildi.</p>
    </div>
    <div class="content">
      ${items
        .map((i) => {
          const link = `${baseUrl}/symbol/${encodeURIComponent(i.ticker)}`;
          const badgeClass = i.signal === "AL" ? "badge-AL" : i.signal === "SAT" ? "badge-SAT" : "badge-TUT";
          return `
            <div class="item-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 16px;">${escapeHtml(i.ticker)}</strong>
                <span class="badge ${badgeClass}">${i.signal} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})</span>
              </div>
              <div class="price">Fiyat: ${i.price.toFixed(2)}</div>
              <div style="font-size: 13px; font-weight: 600; color: #3f3f46;">Tetikleyen Göstergeler:</div>
              <ul class="reasons">
                ${i.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
              </ul>
              <div>
                <a href="${link}" class="btn">Grafik ve Detayları Gör →</a>
              </div>
            </div>`;
        })
        .join("")}
    </div>
    <div class="footer">
      ${RISK_NOTE}
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendSignalMail(items: SignalMailItem[]): Promise<boolean> {
  const provider = getMailProvider();
  if (!provider) {
    console.warn("[mail] GMAIL_USER/GMAIL_APP_PASSWORD veya RESEND_API_KEY tanımlı değil, e-posta atlandı.");
    return false;
  }

  const to = process.env.MAIL_TO || process.env.GMAIL_USER;
  if (!to) {
    console.warn("[mail] Alıcı e-posta adresi (MAIL_TO) tanımlı değil.");
    return false;
  }

  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const { subject, text, html } = formatMailContent(items, baseUrl);

  if (provider === "gmail") {
    const cleanPassword = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: cleanPassword,
      },
    });

    await transporter.sendMail({
      from: `"Finans Asistanı" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[mail] Gmail üzerinden başarıyla gönderildi: ${to}`);
    return true;
  }

  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Finans Asistanı <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    });

    if (error) throw new Error(`Resend hatası: ${error.message}`);
    console.log(`[mail] Resend üzerinden başarıyla gönderildi: ${to}`);
    return true;
  }

  return false;
}

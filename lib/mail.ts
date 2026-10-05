import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { SignalMailItem } from "./types";
import type { CategorizedSignals } from "./multitimeframe";

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

async function sendMailPayload({
  subject,
  text,
  html,
}: {
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const provider = getMailProvider();
  if (!provider) {
    console.warn("[mail] GMAIL_USER veya RESEND_API_KEY tanımlı değil, e-posta atlandı.");
    return false;
  }

  const to = process.env.MAIL_TO || process.env.GMAIL_USER;
  if (!to) {
    console.warn("[mail] Alıcı e-posta adresi (MAIL_TO) tanımlı değil.");
    return false;
  }

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

export async function sendSignalMail(items: SignalMailItem[]): Promise<boolean> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = `Sinyal Değişimi: ${items.map((i) => `${i.ticker} ${i.signal}`).join(", ")}`;

  const text =
    items
      .map((i) => {
        const link = `${baseUrl}/symbol/${encodeURIComponent(i.ticker)}`;
        return `${i.ticker}: ${i.signal} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})\nFiyat: ${i.price.toFixed(2)}\nTetikleyen: ${i.reasons.join(", ")}\nDetay: ${link}`;
      })
      .join("\n\n") + `\n\n${RISK_NOTE}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Finans Asistanı · Sinyal Değişimi</h2>
      ${items
        .map(
          (i) => `
        <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h3>${escapeHtml(i.ticker)} - ${i.signal} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})</h3>
          <p>Fiyat: ${i.price.toFixed(2)}</p>
          <ul>${i.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
          <a href="${baseUrl}/symbol/${encodeURIComponent(i.ticker)}">Grafiği Gör</a>
        </div>`
        )
        .join("")}
      <p style="font-size: 11px; color: #71717a;">${RISK_NOTE}</p>
    </div>`;

  return sendMailPayload({ subject, text, html });
}

// Multi-timeframe categorized email sender (1h, 2h, 4h, 1wk, 1mo)
export async function sendCategorizedTimeframeMail(data: CategorizedSignals): Promise<boolean> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const scanTime = new Date(data.scannedAt).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const scanDate = new Date(data.scannedAt).toLocaleDateString("tr-TR");

  const subject = `BIST Çoklu Zaman Dilimi AL/SAT Raporu (${scanTime}) [1S, 2S, 4S, Haftalık, Aylık]`;

  const tfList: Array<{ key: keyof typeof data.categories; title: string; badge: string }> = [
    { key: "1h", title: "1 Saatlik Sinyaller (Kısa Vade)", badge: "1 SAATLİK" },
    { key: "2h", title: "2 Saatlik Sinyaller (Kısa-Orta Vade)", badge: "2 SAATLİK" },
    { key: "4h", title: "4 Saatlik Sinyaller (Gün İçi Ana Salınım)", badge: "4 SAATLİK" },
    { key: "1wk", title: "Haftalık Sinyaller (Orta Vade)", badge: "HAFTALIK" },
    { key: "1mo", title: "Aylık Sinyaller (Uzun Vade)", badge: "AYLIK" },
  ];

  let text = `FİNANS ASİSTANI · BIST ÇOKLU ZAMAN DİLİMİ AL/SAT RAPORU\nTarih & Saat: ${scanDate} ${scanTime}\nSeans Durumu: ${data.isWithinHours ? "Açık (09:50 - 18:00)" : "Kapalı / Seans Dışı"}\n\n`;

  let categoryHtml = "";

  for (const tf of tfList) {
    const cat = data.categories[tf.key];
    const buys = cat.buys;
    const sells = cat.sells;

    text += `\n=== ${tf.title} ===\n`;

    if (buys.length === 0 && sells.length === 0) {
      text += "Bu periyotta yeni AL/SAT sinyali bulunmuyor.\n";
    }

    if (buys.length > 0) {
      text += `AL Verenler (${buys.length}):\n`;
      for (const b of buys) {
        text += `  * ${b.code} (Fiyat: ${b.price.toFixed(2)}, Skor: +${b.score}, RSI: ${b.rsi ?? "—"})\n`;
      }
    }

    if (sells.length > 0) {
      text += `SAT Verenler (${sells.length}):\n`;
      for (const s of sells) {
        text += `  * ${s.code} (Fiyat: ${s.price.toFixed(2)}, Skor: ${s.score}, RSI: ${s.rsi ?? "—"})\n`;
      }
    }

    // HTML section
    categoryHtml += `
      <div style="margin-bottom: 24px; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; background: #ffffff;">
        <div style="background: #09090b; color: #fafafa; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 14px;">${tf.title}</strong>
          <span style="background: #27272a; color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${tf.badge}</span>
        </div>
        <div style="padding: 14px 16px;">
          ${
            buys.length === 0 && sells.length === 0
              ? `<p style="margin: 0; font-size: 12px; color: #71717a; font-style: italic;">Bu zaman diliminde aktif AL veya SAT eşiğinde hisse bulunmuyor.</p>`
              : `
              <div style="margin-bottom: ${sells.length > 0 ? "12px" : "0"};">
                <div style="font-size: 12px; font-weight: 700; color: #16a34a; margin-bottom: 6px;">🟢 AL SİNYALLERİ (${buys.length})</div>
                ${
                  buys.length === 0
                    ? `<span style="font-size: 11px; color: #a1a1aa;">AL veren hisse yok.</span>`
                    : buys
                        .map(
                          (b) => `
                        <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 8px 12px; margin-bottom: 6px; border-radius: 0 6px 6px 0;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <a href="${baseUrl}/symbol/${encodeURIComponent(b.ticker)}" style="font-weight: 700; font-size: 13px; color: #15803d; text-decoration: none;">${escapeHtml(b.code)}</a>
                            <span style="font-size: 12px; font-weight: 600; color: #18181b;">₺${b.price.toFixed(2)}</span>
                          </div>
                          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
                            Skor: <strong style="color: #16a34a;">+${b.score.toFixed(2)}</strong> ${b.rsi != null ? `· RSI: ${b.rsi}` : ""} · ${escapeHtml(b.reasons[0] ?? "")}
                          </div>
                        </div>`
                        )
                        .join("")
                }
              </div>

              <div>
                <div style="font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">🔴 SAT SİNYALLERİ (${sells.length})</div>
                ${
                  sells.length === 0
                    ? `<span style="font-size: 11px; color: #a1a1aa;">SAT veren hisse yok.</span>`
                    : sells
                        .map(
                          (s) => `
                        <div style="background: #fef2f2; border-left: 3px solid #ef4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 0 6px 6px 0;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <a href="${baseUrl}/symbol/${encodeURIComponent(s.ticker)}" style="font-weight: 700; font-size: 13px; color: #b91c1c; text-decoration: none;">${escapeHtml(s.code)}</a>
                            <span style="font-size: 12px; font-weight: 600; color: #18181b;">₺${s.price.toFixed(2)}</span>
                          </div>
                          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
                            Skor: <strong style="color: #dc2626;">${s.score.toFixed(2)}</strong> ${s.rsi != null ? `· RSI: ${s.rsi}` : ""} · ${escapeHtml(s.reasons[0] ?? "")}
                          </div>
                        </div>`
                        )
                        .join("")
                }
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 20px; }
    .container { max-width: 640px; margin: 0 auto; background: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; }
    .header { background: #09090b; color: #fafafa; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #f4f4f5; }
    .header p { margin: 6px 0 0; font-size: 12px; color: #a1a1aa; }
    .content { padding: 20px 24px; }
    .footer { padding: 14px 24px; background: #f4f4f5; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Finans Asistanı · Seans İçi Çoklu Zaman Dilimi Raporu</h2>
      <p>15 Dakikalık Otomatik Tarama (09:50 - 18:00) · <strong>${scanDate} ${scanTime}</strong></p>
    </div>
    <div class="content">
      <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #0369a1;">
        ℹ️ BIST hisseleri için <strong>1 Saatlik, 2 Saatlik, 4 Saatlik, Haftalık ve Aylık</strong> periyotlarda teknik göstergeler taranarak kategorize edilmiştir.
      </div>

      ${categoryHtml}
    </div>
    <div class="footer">
      ${RISK_NOTE}
    </div>
  </div>
</body>
</html>`;

  return sendMailPayload({ subject, text, html });
}

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

import { getActiveRecipientEmails } from "./mail-recipients-storage";

export function isMailConfigured(): boolean {
  const provider = getMailProvider();
  if (!provider) return false;
  return true;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

export async function resolveRecipients(customRecipients?: string[]): Promise<string[]> {
  if (customRecipients && customRecipients.length > 0) {
    return customRecipients;
  }
  const fromFile = await getActiveRecipientEmails();
  if (fromFile.length > 0) {
    return fromFile;
  }
  const fallback = process.env.MAIL_TO || process.env.GMAIL_USER;
  if (fallback) {
    return fallback.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function sendMailPayload({
  subject,
  text,
  html,
  recipients,
}: {
  subject: string;
  text: string;
  html: string;
  recipients?: string[];
}): Promise<boolean> {
  const provider = getMailProvider();
  if (!provider) {
    console.warn("[mail] GMAIL_USER veya RESEND_API_KEY tanımlı değil, e-posta atlandı.");
    return false;
  }

  const toList = await resolveRecipients(recipients);
  if (toList.length === 0) {
    console.warn(
      "[mail] Gönderilecek aktif alıcı e-posta adresi bulunamadı (mail-recipients.md dosyasında aktif alıcı yok ve MAIL_TO tanımlı değil)."
    );
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
      to: toList,
      subject,
      text,
      html,
    });

    console.log(`[mail] Gmail üzerinden ${toList.length} alıcıya başarıyla gönderildi: ${toList.join(", ")}`);
    return true;
  }

  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Finans Asistanı <onboarding@resend.dev>",
      to: toList,
      subject,
      html,
      text,
    });

    if (error) throw new Error(`Resend hatası: ${error.message}`);
    console.log(`[mail] Resend üzerinden ${toList.length} alıcıya başarıyla gönderildi: ${toList.join(", ")}`);
    return true;
  }

  return false;
}

export async function sendSignalMail(
  items: SignalMailItem[],
  recipients?: string[]
): Promise<boolean> {
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

  return sendMailPayload({ subject, text, html, recipients });
}

// Multi-timeframe categorized email sender (1h, 2h, 4h, 1wk, 1mo)
export async function sendCategorizedTimeframeMail(
  data: CategorizedSignals,
  frequencyLabel = "15 Dakikalık",
  recipients?: string[]
): Promise<boolean> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const scanTime = new Date(data.scannedAt).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const scanDate = new Date(data.scannedAt).toLocaleDateString("tr-TR");

  const subject = `BIST Çoklu Zaman Dilimi AL/SAT Raporu (${scanTime}) [5dk, 15dk, 1S, 4S, Günlük, Haftalık]`;

  const tfList: Array<{ key: keyof typeof data.categories; title: string; badge: string }> = [
    { key: "5m", title: "5 Dakikalık Sinyaller (Çok Hızlı)", badge: "5 DAKİKA" },
    { key: "10m", title: "10 Dakikalık Sinyaller (Hızlı Salınım)", badge: "10 DAKİKA" },
    { key: "15m", title: "15 Dakikalık Sinyaller (Gün İçi Trend)", badge: "15 DAKİKA" },
    { key: "30m", title: "30 Dakikalık Sinyaller (Gün İçi Yön)", badge: "30 DAKİKA" },
    { key: "1h", title: "1 Saatlik Sinyaller (Kısa Vade)", badge: "1 SAATLİK" },
    { key: "2h", title: "2 Saatlik Sinyaller (Kısa-Orta Vade)", badge: "2 SAATLİK" },
    { key: "4h", title: "4 Saatlik Sinyaller (Gün İçi Ana Salınım)", badge: "4 SAATLİK" },
    { key: "1d", title: "Günlük Sinyaller (Ana Trend)", badge: "GÜNLÜK" },
    { key: "1wk", title: "Haftalık Sinyaller (Orta Vade)", badge: "HAFTALIK" },
    { key: "1mo", title: "Aylık Sinyaller (Uzun Vade)", badge: "AYLIK" },
  ];

  let text = `FİNANS ASİSTANI · BIST ÇOKLU ZAMAN DİLİMİ AL/SAT RAPORU\nTarih & Saat: ${scanDate} ${scanTime}\nSeans Durumu: ${data.isWithinHours ? "Açık (09:50 - 18:00)" : "Kapalı / Seans Dışı"}\n\n`;

  let categoryHtml = "";

  for (const tf of tfList) {
    const cat = data.categories[tf.key];
    if (!cat) continue;
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
      <p>${frequencyLabel} Otomatik Tarama (09:50 - 18:00) · <strong>${scanDate} ${scanTime}</strong></p>
    </div>
    <div class="content">
      <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #0369a1;">
        ℹ️ BIST hisseleri için <strong>5dk, 10dk, 15dk, 30dk, 1S, 2S, 4S, Günlük, Haftalık ve Aylık</strong> (toplam 10 zaman dilimi) taranarak teknik ve temel göstergelere göre kategorize edilmiştir.
      </div>

      ${categoryHtml}
    </div>
    <div class="footer">
      ${RISK_NOTE}
    </div>
  </div>
</body>
</html>`;

  return sendMailPayload({ subject, text, html, recipients });
}

export interface PositionAlarmNotification {
  type: "stop_loss" | "take_profit";
  position: {
    ticker: string;
    code: string;
    name: string;
    timeframe: string;
    entryPrice: number;
    currentPrice: number;
    stopLoss: number;
    takeProfit: number;
    profitLossPercent: number;
    notes?: string;
  };
}

export async function sendPositionAlarmMail(
  alarm: PositionAlarmNotification,
  recipients?: string[]
): Promise<boolean> {
  const { type, position } = alarm;
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const isStop = type === "stop_loss";
  const nowTime = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const nowDate = new Date().toLocaleDateString("tr-TR");

  const subject = isStop
    ? `🛑 STOP-LOSS ALARMI: ${position.code} Zarar Durdur Seviyesine Ulaştı (${position.currentPrice.toFixed(2)} TL)`
    : `🎯 KÂR AL HEDEFİ ALARMI: ${position.code} Hedefe Ulaştı! (+%${position.profitLossPercent.toFixed(1)})`;

  const text = `FİNANS ASİSTANI · POZİSYON ALARMI (${nowDate} ${nowTime})\n\n` +
    `Sembol: ${position.code} (${position.name})\n` +
    `Durum: ${isStop ? "ZARAR DURDUR (STOP-LOSS) SEVİYESİNE ULAŞILDI" : "KÂR AL (TAKE-PROFIT) HEDEFİNE ULAŞILDI"}\n` +
    `Alınan Periyot: ${position.timeframe.toUpperCase()}\n` +
    `Alış Fiyatı: ₺${position.entryPrice.toFixed(2)}\n` +
    `Güncel Fiyat: ₺${position.currentPrice.toFixed(2)}\n` +
    `Kâr/Zarar: %${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}\n` +
    `Belirlenen Stop-Loss: ₺${position.stopLoss.toFixed(2)}\n` +
    `Belirlenen Kâr Al Hedefi: ₺${position.takeProfit.toFixed(2)}\n\n` +
    `Grafik & Detay: ${baseUrl}/symbol/${encodeURIComponent(position.ticker)}\n\n` +
    `${RISK_NOTE}`;

  const themeColor = isStop ? "#dc2626" : "#16a34a";
  const themeBg = isStop ? "#fef2f2" : "#f0fdf4";
  const themeBorder = isStop ? "#f87171" : "#4ade80";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .alert-header { background: ${themeColor}; color: #ffffff; padding: 20px 24px; text-align: left; }
    .content { padding: 24px; }
    .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #27272a; font-size: 13px; }
    .metric-label { color: #a1a1aa; }
    .metric-val { font-weight: 700; color: #fafafa; font-family: monospace; }
    .btn { display: inline-block; background: ${themeColor}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; margin-top: 20px; text-align: center; }
    .footer { padding: 16px 24px; background: #09090b; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="alert-header">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
        ${isStop ? "🛑 OTOMATİK RİSK KORUMA UYARISI" : "🎯 OTOMATİK HEDEF ULAŞMA BİLDİRİMİ"}
      </div>
      <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        ${escapeHtml(position.code)} · ${isStop ? "Stop-Loss Seviyesine Ulaşıldı!" : "Kâr Al Hedefine Ulaşıldı!"}
      </h2>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">
        ${escapeHtml(position.name)} · Alınan Periyot: [${position.timeframe.toUpperCase()}] · ${nowDate} ${nowTime}
      </p>
    </div>

    <div class="content">
      <div style="background: ${themeBg}; border: 1px solid ${themeBorder}; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; color: #18181b;">
        <div style="font-size: 12px; font-weight: 600; color: #52525b;">${isStop ? "ZARAR DURDURMA ALARMI" : "KÂR REALİZASYONU ALARMI"}</div>
        <div style="font-size: 22px; font-weight: 800; color: ${themeColor}; margin: 4px 0;">
          ₺${position.currentPrice.toFixed(2)} 
          <span style="font-size: 14px; font-weight: 700; margin-left: 8px;">
            (${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}%)
          </span>
        </div>
        <div style="font-size: 12px; color: #3f3f46;">
          ${
            isStop
              ? `Hisse belirlenen <strong>₺${position.stopLoss.toFixed(2)}</strong> stop-loss seviyesinin altına indi. Sermaye güvenliği için pozisyonu gözden geçirmeniz önerilir.`
              : `Hisse hedeflenen <strong>₺${position.takeProfit.toFixed(2)}</strong> seviyesine ulaştı. Kârınızı realize etme aşamasına geldiniz.`
          }
        </div>
      </div>

      <div style="background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 14px 18px;">
        <div class="metric-row">
          <span class="metric-label">Alış Fiyatı</span>
          <span class="metric-val">₺${position.entryPrice.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Güncel Fiyat</span>
          <span class="metric-val" style="color: ${themeColor}; font-size: 14px;">₺${position.currentPrice.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Net Kâr / Zarar</span>
          <span class="metric-val" style="color: ${position.profitLossPercent >= 0 ? "#22c55e" : "#ef4444"};">
            ${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}%
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Belirlenen Stop-Loss</span>
          <span class="metric-val" style="color: #ef4444;">₺${position.stopLoss.toFixed(2)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
          <span class="metric-label">Belirlenen Kâr Al Hedefi</span>
          <span class="metric-val" style="color: #22c55e;">₺${position.takeProfit.toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${baseUrl}/symbol/${encodeURIComponent(position.ticker)}" class="btn">
          Grafiği ve Pozisyonu İncele →
        </a>
      </div>
    </div>

    <div class="footer">
      ${RISK_NOTE}
    </div>
  </div>
</body>
</html>`;

  return sendMailPayload({ subject, text, html, recipients });
}


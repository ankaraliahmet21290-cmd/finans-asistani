import { Resend } from "resend";
import type { SignalMailItem } from "./types";

const RISK_NOTE =
  "Bu e-posta bir karar destek çıktısıdır, yatırım tavsiyesi değildir. Sinyaller geçmiş veriye dayanır ve kâr garantisi vermez.";

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_TO);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

export async function sendSignalMail(items: SignalMailItem[]): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn("[mail] RESEND_API_KEY / MAIL_TO tanımlı değil, e-posta atlandı.");
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const html =
    items
      .map((i) => {
        const link = `${baseUrl}/symbol/${encodeURIComponent(i.ticker)}`;
        return `
          <h3 style="margin:0 0 4px">${escapeHtml(i.ticker)}: <span style="color:${i.signal === "AL" ? "#16a34a" : i.signal === "SAT" ? "#dc2626" : "#6b7280"}">${i.signal}</span> (skor ${i.score.toFixed(2)})</h3>
          <p style="margin:0 0 4px">Güncel fiyat: ${i.price.toFixed(2)}</p>
          <p style="margin:0 0 4px;font-weight:600">Tetikleyen göstergeler:</p>
          <ul style="margin:0 0 12px;padding-left:18px">${i.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
          <p style="margin:0 0 16px"><a href="${link}">Uygulamada aç</a></p>`;
      })
      .join("<hr/>") +
    `<p style="color:#888;font-size:12px">${RISK_NOTE}</p>`;

  const { error } = await resend.emails.send({
    from: "Finans Asistanı <onboarding@resend.dev>",
    to: process.env.MAIL_TO!,
    subject: `Sinyal değişti: ${items.map((i) => `${i.ticker} ${i.signal}`).join(", ")}`,
    html,
  });

  if (error) throw new Error(`Resend hatası: ${error.message}`);
  return true;
}

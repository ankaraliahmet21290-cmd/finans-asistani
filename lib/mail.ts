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

import { getActiveRecipientEmails, type RecipientFilterOptions } from "./mail-recipients-storage";
import { detectAssetCategory } from "./markets";

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

export async function resolveRecipients(
  customRecipients?: string[],
  context?: RecipientFilterOptions
): Promise<string[]> {
  if (customRecipients && customRecipients.length > 0) {
    return customRecipients;
  }
  const fromFile = await getActiveRecipientEmails(context);
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
  context,
}: {
  subject: string;
  text: string;
  html: string;
  recipients?: string[];
  context?: RecipientFilterOptions;
}): Promise<boolean> {
  const provider = getMailProvider();
  if (!provider) {
    console.warn("[mail] GMAIL_USER veya RESEND_API_KEY tanımlı değil, e-posta atlandı.");
    return false;
  }

  const toList = await resolveRecipients(recipients, context);
  if (toList.length === 0) {
    console.warn(
      `[mail] "${subject.slice(0, 30)}..." için uygun aktif alıcı e-posta adresi bulunamadı (tercih veya filtreye uyan aktif alıcı yok).`
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

function normalizeMarketScope(scopeOrCategory?: string): "bist" | "crypto" | "commodity_forex" | "us_stocks" | undefined {
  if (!scopeOrCategory) return undefined;
  if (scopeOrCategory === "crypto") return "crypto";
  if (scopeOrCategory === "us_stock" || scopeOrCategory === "us_stocks") return "us_stocks";
  if (scopeOrCategory === "gold" || scopeOrCategory === "commodity" || scopeOrCategory === "forex" || scopeOrCategory === "commodity_forex") return "commodity_forex";
  return "bist";
}

export async function sendSignalMail(
  items: SignalMailItem[],
  recipients?: string[],
  timeframeLabel?: string
): Promise<boolean> {
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const tfSuffix = timeframeLabel ? ` [${timeframeLabel}]` : "";
  const subject = `Sinyal Değişimi${tfSuffix}: ${items.map((i) => `${i.ticker} ${i.signal}`).join(", ")}`;

  const text =
    items
      .map((i) => {
        const link = `${baseUrl}/symbol/${encodeURIComponent(i.ticker)}`;
        const tfText = i.timeframe ? ` (${i.timeframe} Mum)` : "";
        return `${i.ticker}: ${i.signal}${tfText} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})\nFiyat: ${i.price.toFixed(2)}\nTetikleyen: ${i.reasons.join(", ")}\nDetay: ${link}`;
      })
      .join("\n\n") + `\n\n${RISK_NOTE}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Finans Asistanı · Sinyal Değişimi${timeframeLabel ? ` (${escapeHtml(timeframeLabel)} Mum Periyodu)` : ""}</h2>
      ${items
        .map(
          (i) => `
        <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h3>${escapeHtml(i.ticker)} - ${i.signal}${i.timeframe ? ` <span style="font-size: 12px; font-weight: normal; color: #71717a;">(${escapeHtml(i.timeframe)})</span>` : ""} (Skor: ${i.score > 0 ? "+" : ""}${i.score.toFixed(2)})</h3>
          <p>Fiyat: ${i.price.toFixed(2)}</p>
          <ul>${i.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
          <a href="${baseUrl}/symbol/${encodeURIComponent(i.ticker)}">Grafiği Gör</a>
        </div>`
        )
        .join("")}
      <p style="font-size: 11px; color: #71717a;">${RISK_NOTE}</p>
    </div>`;

  const firstTicker = items[0]?.ticker;
  const marketScope = normalizeMarketScope(firstTicker ? detectAssetCategory(firstTicker) : undefined);

  return sendMailPayload({
    subject,
    text,
    html,
    recipients,
    context: { type: "watchlist", market: marketScope },
  });
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

  const market = data.market;
  const isCrypto = market === "crypto";
  const isUs = market === "us_stocks";
  const isCommodity = market === "commodity_forex";

  const marketTitle = isCrypto
    ? "Kripto Para"
    : isUs
    ? "Amerikan Borsası (ABD)"
    : isCommodity
    ? "Emtia & Döviz"
    : "BIST";

  const subject = `${marketTitle} Çoklu Zaman Dilimi AL/SAT Raporu (${scanTime}) [5dk, 15dk, 1S, 4S, Günlük, Haftalık]`;

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

  const sessionStatusText = isCrypto
    ? "7/24 Kesintisiz Piyasa"
    : isUs
    ? (data.isWithinHours ? "Açık (16:30 - 23:00 TSİ)" : "Kapalı / Seans Dışı")
    : isCommodity
    ? (data.isWithinHours ? "Açık (Hafta İçi Kesintisiz)" : "Hafta Sonu Kapalı")
    : (data.isWithinHours ? "Açık (09:50 - 18:00)" : "Kapalı / Seans Dışı");

  const formatPriceStr = (ticker: string, price: number) => {
    if (ticker.endsWith(".IS") || ticker.includes("TRY")) {
      return `₺${price.toFixed(2)}`;
    }
    return `$${price >= 10 ? price.toFixed(2) : price.toFixed(4)}`;
  };

  const marketPath = isCrypto
    ? "/kripto#signals-section"
    : isUs
    ? "/abd-borsasi#signals-section"
    : isCommodity
    ? "/emtia-doviz#signals-section"
    : "/#signals-section";
  const marketUrl = `${baseUrl}${marketPath}`;

  const MAX_DISPLAY_PER_SIDE = 5; // Gmail 102 KB kırpma (clipping) sınırını korumak için periyot başına en güçlü 5 AL / 5 SAT

  let text = `FİNANS ASİSTANI · ${marketTitle.toUpperCase()} ÇOKLU ZAMAN DİLİMİ AL/SAT RAPORU\nTarih & Saat: ${scanDate} ${scanTime}\nSeans Durumu: ${sessionStatusText}\nCanlı Ekran: ${marketUrl}\n\n`;

  let categoryHtml = "";

  for (const tf of tfList) {
    const cat = data.categories[tf.key];
    if (!cat) continue;
    const buys = cat.buys;
    const sells = cat.sells;

    const visibleBuys = buys.slice(0, MAX_DISPLAY_PER_SIDE);
    const hiddenBuysCount = Math.max(0, buys.length - MAX_DISPLAY_PER_SIDE);

    const visibleSells = sells.slice(0, MAX_DISPLAY_PER_SIDE);
    const hiddenSellsCount = Math.max(0, sells.length - MAX_DISPLAY_PER_SIDE);

    text += `\n=== ${tf.title} (AL: ${buys.length}, SAT: ${sells.length}) ===\n`;

    if (buys.length === 0 && sells.length === 0) {
      text += "Bu periyotta yeni AL/SAT sinyali bulunmuyor.\n";
    }

    if (visibleBuys.length > 0) {
      text += `AL Verenler (${buys.length}):\n`;
      for (const b of visibleBuys) {
        text += `  * ${b.code} (Fiyat: ${formatPriceStr(b.ticker, b.price)}, Skor: +${b.score}, RSI: ${b.rsi ?? "—"})\n`;
      }
      if (hiddenBuysCount > 0) {
        text += `  ... ve ${hiddenBuysCount} varlık daha (canlı ekranda: ${marketUrl})\n`;
      }
    }

    if (visibleSells.length > 0) {
      text += `SAT Verenler (${sells.length}):\n`;
      for (const s of visibleSells) {
        text += `  * ${s.code} (Fiyat: ${formatPriceStr(s.ticker, s.price)}, Skor: ${s.score}, RSI: ${s.rsi ?? "—"})\n`;
      }
      if (hiddenSellsCount > 0) {
        text += `  ... ve ${hiddenSellsCount} varlık daha (canlı ekranda: ${marketUrl})\n`;
      }
    }

    // HTML section
    categoryHtml += `
      <div style="margin-bottom: 20px; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; background: #ffffff;">
        <div style="background: #09090b; color: #fafafa; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 13px;">${tf.title}</strong>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="background: #18181b; color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; border: 1px solid #27272a;">${tf.badge}</span>
            <span style="font-size: 10px; color: #a1a1aa;">(${buys.length} AL · ${sells.length} SAT)</span>
          </div>
        </div>
        <div style="padding: 12px 14px;">
          ${
            buys.length === 0 && sells.length === 0
              ? `<p style="margin: 0; font-size: 12px; color: #71717a; font-style: italic;">Bu zaman diliminde aktif AL veya SAT eşiğinde varlık bulunmuyor.</p>`
              : `
              <div style="margin-bottom: ${sells.length > 0 ? "12px" : "0"};">
                <div style="font-size: 11px; font-weight: 700; color: #16a34a; margin-bottom: 6px;">🟢 AL SİNYALLERİ (${buys.length}) ${hiddenBuysCount > 0 ? `<span style="font-weight: 400; color: #71717a;">· En güçlü ${MAX_DISPLAY_PER_SIDE} listelendi</span>` : ""}</div>
                ${
                  buys.length === 0
                    ? `<span style="font-size: 11px; color: #a1a1aa;">AL veren varlık yok.</span>`
                    : visibleBuys
                        .map(
                          (b) => `
                        <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 6px 10px; margin-bottom: 4px; border-radius: 0 4px 4px 0;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <a href="${baseUrl}/symbol/${encodeURIComponent(b.ticker)}" style="font-weight: 700; font-size: 12px; color: #15803d; text-decoration: none;">${escapeHtml(b.code)}</a>
                            <span style="font-size: 11px; font-weight: 600; color: #18181b;">${formatPriceStr(b.ticker, b.price)}</span>
                          </div>
                          <div style="font-size: 10px; color: #4b5563; margin-top: 1px;">
                            Skor: <strong style="color: #16a34a;">+${b.score.toFixed(2)}</strong> ${b.rsi != null ? `· RSI: ${b.rsi}` : ""} · ${escapeHtml(b.reasons[0] ?? "")}
                          </div>
                        </div>`
                        )
                        .join("")
                }
                ${
                  hiddenBuysCount > 0
                    ? `<div style="text-align: right; margin-top: 4px;"><a href="${marketUrl}" style="font-size: 11px; color: #16a34a; font-weight: 600; text-decoration: none;">+ ${hiddenBuysCount} varlık daha AL bölgesinde (Ekranda Gör ↗)</a></div>`
                    : ""
                }
              </div>

              <div>
                <div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">🔴 SAT SİNYALLERİ (${sells.length}) ${hiddenSellsCount > 0 ? `<span style="font-weight: 400; color: #71717a;">· En belirgin ${MAX_DISPLAY_PER_SIDE} listelendi</span>` : ""}</div>
                ${
                  sells.length === 0
                    ? `<span style="font-size: 11px; color: #a1a1aa;">SAT veren varlık yok.</span>`
                    : visibleSells
                        .map(
                          (s) => `
                        <div style="background: #fef2f2; border-left: 3px solid #ef4444; padding: 6px 10px; margin-bottom: 4px; border-radius: 0 4px 4px 0;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <a href="${baseUrl}/symbol/${encodeURIComponent(s.ticker)}" style="font-weight: 700; font-size: 12px; color: #b91c1c; text-decoration: none;">${escapeHtml(s.code)}</a>
                            <span style="font-size: 11px; font-weight: 600; color: #18181b;">${formatPriceStr(s.ticker, s.price)}</span>
                          </div>
                          <div style="font-size: 10px; color: #4b5563; margin-top: 1px;">
                            Skor: <strong style="color: #dc2626;">${s.score.toFixed(2)}</strong> ${s.rsi != null ? `· RSI: ${s.rsi}` : ""} · ${escapeHtml(s.reasons[0] ?? "")}
                          </div>
                        </div>`
                        )
                        .join("")
                }
                ${
                  hiddenSellsCount > 0
                    ? `<div style="text-align: right; margin-top: 4px;"><a href="${marketUrl}" style="font-size: 11px; color: #dc2626; font-weight: 600; text-decoration: none;">+ ${hiddenSellsCount} varlık daha SAT bölgesinde (Ekranda Gör ↗)</a></div>`
                    : ""
                }
              </div>`
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 16px; }
    .container { max-width: 640px; margin: 0 auto; background: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; }
    .header { background: #09090b; color: #fafafa; padding: 18px 20px; }
    .header h2 { margin: 0; font-size: 17px; font-weight: 700; color: #f4f4f5; }
    .header p { margin: 6px 0 0; font-size: 12px; color: #a1a1aa; }
    .content { padding: 16px 20px; }
    .footer { padding: 14px 20px; background: #f4f4f5; border-top: 1px solid #e4e4e7; font-size: 11px; color: #71717a; text-align: center; }
    .cta-btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Finans Asistanı · ${marketTitle} Çoklu Zaman Dilimi Raporu</h2>
      <p>${frequencyLabel} Otomatik Tarama (${sessionStatusText}) · <strong>${scanDate} ${scanTime}</strong></p>
      <div style="margin-top: 10px;">
        <a href="${marketUrl}" class="cta-btn">Canlı Sinyal Masasını Aç ↗</a>
      </div>
    </div>
    <div class="content">
      <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #0369a1;">
        ℹ️ ${marketTitle} varlıkları için <strong>5dk, 10dk, 15dk, 30dk, 1S, 2S, 4S, Günlük, Haftalık ve Aylık</strong> (toplam 10 zaman dilimi) taranmıştır. E-posta okunabilirliğini korumak için her periyotta en güçlü sinyaller öne çıkarılmıştır.
      </div>

      ${categoryHtml}

      <div style="text-align: center; margin: 20px 0 10px;">
        <a href="${marketUrl}" class="cta-btn">Tüm Sinyal Matrisini Canlı Ekranda Gör ↗</a>
      </div>
    </div>
    <div class="footer">
      ${RISK_NOTE}
    </div>
  </div>
</body>
</html>`;

  return sendMailPayload({
    subject,
    text,
    html,
    recipients,
    context: { type: "reports", market: normalizeMarketScope(data.market) },
  });
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
  const isTry = position.ticker.endsWith(".IS") || position.ticker.includes("TRY");
  const currSymbol = isTry ? "₺" : "$";
  const currSuffix = isTry ? "TL" : "USD";

  const subject = isStop
    ? `🛑 STOP-LOSS ALARMI: ${position.code} Zarar Durdur Seviyesine Ulaştı (${currSymbol}${position.currentPrice.toFixed(2)} ${currSuffix})`
    : `🎯 KÂR AL HEDEFİ ALARMI: ${position.code} Hedefe Ulaştı! (+%${position.profitLossPercent.toFixed(1)})`;

  const text = `FİNANS ASİSTANI · POZİSYON ALARMI (${nowDate} ${nowTime})\n\n` +
    `Sembol: ${position.code} (${position.name})\n` +
    `Durum: ${isStop ? "ZARAR DURDUR (STOP-LOSS) SEVİYESİNE ULAŞILDI" : "KÂR AL (TAKE-PROFIT) HEDEFİNE ULAŞILDI"}\n` +
    `Alınan Periyot: ${position.timeframe.toUpperCase()}\n` +
    `Alış Fiyatı: ${currSymbol}${position.entryPrice.toFixed(2)}\n` +
    `Güncel Fiyat: ${currSymbol}${position.currentPrice.toFixed(2)}\n` +
    `Kâr/Zarar: %${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}\n` +
    `Belirlenen Stop-Loss: ${currSymbol}${position.stopLoss.toFixed(2)}\n` +
    `Belirlenen Kâr Al Hedefi: ${currSymbol}${position.takeProfit.toFixed(2)}\n\n` +
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
          ${currSymbol}${position.currentPrice.toFixed(2)} 
          <span style="font-size: 14px; font-weight: 700; margin-left: 8px;">
            (${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}%)
          </span>
        </div>
        <div style="font-size: 12px; color: #3f3f46;">
          ${
            isStop
              ? `Varlık belirlenen <strong>${currSymbol}${position.stopLoss.toFixed(2)}</strong> stop-loss seviyesinin altına indi. Sermaye güvenliği için pozisyonu gözden geçirmeniz önerilir.`
              : `Varlık hedeflenen <strong>${currSymbol}${position.takeProfit.toFixed(2)}</strong> seviyesine ulaştı. Kârınızı realize etme aşamasına geldiniz.`
          }
        </div>
      </div>

      <div style="background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 14px 18px;">
        <div class="metric-row">
          <span class="metric-label">Alış Fiyatı</span>
          <span class="metric-val">${currSymbol}${position.entryPrice.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Güncel Fiyat</span>
          <span class="metric-val" style="color: ${themeColor}; font-size: 14px;">${currSymbol}${position.currentPrice.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Net Kâr / Zarar</span>
          <span class="metric-val" style="color: ${position.profitLossPercent >= 0 ? "#22c55e" : "#ef4444"};">
            ${position.profitLossPercent > 0 ? "+" : ""}${position.profitLossPercent.toFixed(2)}%
          </span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Belirlenen Stop-Loss</span>
          <span class="metric-val" style="color: #ef4444;">${currSymbol}${position.stopLoss.toFixed(2)}</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
          <span class="metric-label">Belirlenen Kâr Al Hedefi</span>
          <span class="metric-val" style="color: #22c55e;">${currSymbol}${position.takeProfit.toFixed(2)}</span>
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

  const assetScope = normalizeMarketScope(detectAssetCategory(position.ticker));
  return sendMailPayload({
    subject,
    text,
    html,
    recipients,
    context: { type: "positions", market: assetScope },
  });
}


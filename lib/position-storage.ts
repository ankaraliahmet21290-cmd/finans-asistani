import fs from "fs/promises";
import path from "path";
import type {
  PositionCheckInterval,
  PositionEntry,
  PositionSettings,
  PositionStatus,
  PositionTrackerData,
} from "./position-types";
import { findBistCompany } from "./bist";
import { normalizeTimeframeKey, type TimeframeKey } from "./timeframes";

export const POSITIONS_FILE_PATH = path.join(process.cwd(), "portfoy-takip.md");

export const DEFAULT_POSITION_SETTINGS: PositionSettings = {
  checkInterval: "5m",
  intervalMinutes: 5,
  onlyTradingHours: true,
  lastCheckAt: null,
  lastAlarmSentAt: null,
  totalAlarmsSent: 0,
};

export const INTERVAL_TO_MINUTES: Record<PositionCheckInterval, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  off: 0,
};

export function normalizeCheckInterval(raw: string): PositionCheckInterval {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (["1m", "1dk", "1dakika", "1"].includes(clean)) return "1m";
  if (["5m", "5dk", "5dakika", "5"].includes(clean)) return "5m";
  if (["15m", "15dk", "15dakika", "15"].includes(clean)) return "15m";
  if (["30m", "30dk", "30dakika", "30"].includes(clean)) return "30m";
  if (["1h", "1s", "1saat", "60m", "60"].includes(clean)) return "1h";
  if (["off", "kapali", "kapalı", "devredisi", "0"].includes(clean)) return "off";
  return "5m";
}

function normalizeStatus(raw: string): PositionStatus {
  const clean = raw.trim().toLowerCase();
  if (clean.includes("kar") || clean.includes("kâr") || clean.includes("target") || clean.includes("profit")) {
    return "take_profit_hit";
  }
  if (clean.includes("stop") || clean.includes("zarar")) {
    return "stop_loss_hit";
  }
  if (clean.includes("kapat") || clean.includes("closed")) {
    return "closed";
  }
  return "active";
}

function statusToLabel(status: PositionStatus): string {
  switch (status) {
    case "take_profit_hit":
      return "Kâr Al Tetiklendi";
    case "stop_loss_hit":
      return "Stop-Loss Tetiklendi";
    case "closed":
      return "Kapatıldı";
    case "active":
    default:
      return "Aktif";
  }
}

/**
 * Parses portfoy-takip.md content into settings and position list.
 */
export function parsePositionsMarkdown(content: string): {
  settings: PositionSettings;
  positions: PositionEntry[];
} {
  const settings: PositionSettings = { ...DEFAULT_POSITION_SETTINGS };
  const positions: PositionEntry[] = [];
  const lines = content.split(/\r?\n/);

  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Parse Settings block
    if (line.startsWith("- **Tarama Aralığı:**") || line.startsWith("- **Tarama:**")) {
      const val = line.split(":")[1]?.trim() || "";
      settings.checkInterval = normalizeCheckInterval(val);
      settings.intervalMinutes = INTERVAL_TO_MINUTES[settings.checkInterval];
      continue;
    }
    if (line.startsWith("- **Sadece Seans İçi:**")) {
      const val = line.split(":")[1]?.trim().toLowerCase() || "";
      settings.onlyTradingHours = val.includes("evet") || val.includes("true");
      continue;
    }
    if (line.startsWith("- **Son Kontrol:**")) {
      const val = line.split(":")[1]?.trim() || "";
      settings.lastCheckAt = val === "—" || !val ? null : val;
      continue;
    }
    if (line.startsWith("- **Son Alarm:**")) {
      const val = line.split(":")[1]?.trim() || "";
      settings.lastAlarmSentAt = val === "—" || !val ? null : val;
      continue;
    }

    // Table detection
    if (line.startsWith("|") && line.endsWith("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (parts.length < 6) continue;

      const firstCol = parts[0].toUpperCase();
      // Skip table header or divider lines
      if (
        firstCol === "SEMBOL" ||
        firstCol === "TICKER" ||
        firstCol.startsWith("---") ||
        firstCol.startsWith(":")
      ) {
        inTable = true;
        continue;
      }

      if (!inTable) continue;

      const ticker = parts[0].toUpperCase();
      if (!ticker) continue;

      const bist = findBistCompany(ticker);
      const code = parts[1] || bist?.code || ticker.replace(/\.IS$/, "");
      const name = bist?.name || code;
      const rawTf = parts[2] || "1d";
      const timeframe: TimeframeKey = normalizeTimeframeKey(rawTf);
      const entryPrice = parseFloat(parts[3].replace(/[^0-9.-]/g, "")) || 0;
      const entryDate = parts[4] || new Date().toISOString().slice(0, 10);
      const stopLoss = parseFloat(parts[5].replace(/[^0-9.-]/g, "")) || 0;
      const takeProfit = parseFloat(parts[6].replace(/[^0-9.-]/g, "")) || 0;
      const status = normalizeStatus(parts[7] || "active");
      const notes = parts[8] || "";

      const id = `pos_${ticker.replace(/[^A-Za-z0-9]/g, "")}_${timeframe}_${entryDate.replace(
        /[^0-9]/g,
        ""
      )}`;

      positions.push({
        id,
        ticker,
        code,
        name,
        timeframe,
        entryPrice,
        entryDate,
        stopLoss,
        takeProfit,
        status,
        notes,
      });
    }
  }

  return { settings, positions };
}

/**
 * Serializes settings and positions into portfoy-takip.md format.
 */
export function formatPositionsMarkdown(
  settings: PositionSettings,
  positions: PositionEntry[]
): string {
  const checkLabel =
    settings.checkInterval === "off"
      ? "Kapalı"
      : settings.checkInterval === "1m"
      ? "1 dk"
      : settings.checkInterval === "5m"
      ? "5 dk"
      : settings.checkInterval === "15m"
      ? "15 dk"
      : settings.checkInterval === "30m"
      ? "30 dk"
      : "1 saat";

  let md = `# Portföy Pozisyon Takibi & Alarm Masası

Bu dosya, aldığınız hisseleri, alış periyotlarını, dinamik Stop-Loss ve Kâr Al seviyelerini takip eder.
Fiyat Stop-Loss veya Kâr Al seviyesine ulaştığında otomatik e-posta alarmı gönderilir.

## Ayarlar
- **Tarama Aralığı:** ${checkLabel}
- **Sadece Seans İçi:** ${settings.onlyTradingHours ? "Evet" : "Hayır"}
- **Son Kontrol:** ${settings.lastCheckAt ?? "—"}
- **Son Alarm:** ${settings.lastAlarmSentAt ?? "—"}

## Aktif Pozisyonlar

| Sembol | Kod | Periyot | Alış Fiyatı | Alış Tarihi | Stop-Loss | Kâr Al | Durum | Not |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  if (positions.length === 0) {
    md += `| THYAO.IS | THYAO | 1h | 290.50 | ${new Date().toISOString().slice(0, 10)} | 278.20 | 311.00 | Aktif | Örnek pozisyon kaydı |\n`;
  } else {
    for (const p of positions) {
      const code = p.code || p.ticker.replace(/\.IS$/, "");
      const entryPrice = p.entryPrice.toFixed(2);
      const stopLoss = p.stopLoss.toFixed(2);
      const takeProfit = p.takeProfit.toFixed(2);
      const statusLabel = statusToLabel(p.status);
      const notes = (p.notes || "").replace(/\|/g, "/");

      md += `| ${p.ticker} | ${code} | ${p.timeframe} | ${entryPrice} | ${p.entryDate} | ${stopLoss} | ${takeProfit} | ${statusLabel} | ${notes} |\n`;
    }
  }

  md += `\n> **Nasıl Çalışır?**
> 1. Sayfadan hisse eklediğinizde veya periyot seçtiğinizde bu dosyaya otomatik satır eklenir.
> 2. Belirlediğiniz tarama aralığında hisselerin güncel fiyatları kontrol edilir.
> 3. Fiyat Stop-Loss seviyesinin altına indiğinde veya Kâr Al hedefine ulaştığında bildirim e-postası gönderilir.
`;

  return md;
}

/**
 * Loads positions and settings from portfoy-takip.md. If missing, creates default file.
 */
export async function loadPositionsFile(): Promise<{
  settings: PositionSettings;
  positions: PositionEntry[];
}> {
  try {
    const raw = await fs.readFile(POSITIONS_FILE_PATH, "utf-8");
    return parsePositionsMarkdown(raw);
  } catch {
    const defaultData: PositionTrackerData = {
      settings: DEFAULT_POSITION_SETTINGS,
      positions: [
        {
          id: "pos_THYAO_1h_default",
          ticker: "THYAO.IS",
          code: "THYAO",
          name: "Türk Hava Yolları",
          timeframe: "1h",
          entryPrice: 290.5,
          entryDate: new Date().toISOString().slice(0, 10),
          stopLoss: 278.2,
          takeProfit: 311.0,
          status: "active",
          notes: "1 saatlik kırılımla pozisyon açıldı",
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const content = formatPositionsMarkdown(defaultData.settings, defaultData.positions);
    await fs.writeFile(POSITIONS_FILE_PATH, content, "utf-8");
    return { settings: defaultData.settings, positions: defaultData.positions };
  }
}

/**
 * Saves positions and settings to portfoy-takip.md.
 */
export async function savePositionsFile(
  settings: PositionSettings,
  positions: PositionEntry[]
): Promise<void> {
  const content = formatPositionsMarkdown(settings, positions);
  await fs.writeFile(POSITIONS_FILE_PATH, content, "utf-8");
}

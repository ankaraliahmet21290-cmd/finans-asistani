import fs from "fs/promises";
import path from "path";

export type MailIntervalKey =
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "daily"
  | "off";

export interface MailIntervalOption {
  key: MailIntervalKey;
  minutes: number;
  label: string;
  emailLabel: string;
  desc: string;
  badge: string;
}

export const MAIL_INTERVAL_OPTIONS: MailIntervalOption[] = [
  {
    key: "5m",
    minutes: 5,
    label: "5 dk",
    emailLabel: "5 Dakikalık",
    desc: "Çok Sık (Gün içi anlık takip)",
    badge: "5 DK",
  },
  {
    key: "10m",
    minutes: 10,
    label: "10 dk",
    emailLabel: "10 Dakikalık",
    desc: "Hızlı seans içi takip",
    badge: "10 DK",
  },
  {
    key: "15m",
    minutes: 15,
    label: "15 dk",
    emailLabel: "15 Dakikalık",
    desc: "Standart seans içi tarama",
    badge: "15 DK",
  },
  {
    key: "30m",
    minutes: 30,
    label: "30 dk",
    emailLabel: "30 Dakikalık",
    desc: "Dengeli aralık",
    badge: "30 DK",
  },
  {
    key: "1h",
    minutes: 60,
    label: "1 saat",
    emailLabel: "1 Saatlik",
    desc: "Saat başı düzenli özet",
    badge: "1 SAAT",
  },
  {
    key: "2h",
    minutes: 120,
    label: "2 saat",
    emailLabel: "2 Saatlik",
    desc: "2 saatlik seans özeti",
    badge: "2 SAAT",
  },
  {
    key: "4h",
    minutes: 240,
    label: "4 saat",
    emailLabel: "4 Saatlik",
    desc: "Yarım günlük özet",
    badge: "4 SAAT",
  },
  {
    key: "daily",
    minutes: 1440,
    label: "Günlük",
    emailLabel: "Günlük",
    desc: "Günde 1 kez (Her seans günü)",
    badge: "GÜNLÜK",
  },
  {
    key: "off",
    minutes: 0,
    label: "Kapalı",
    emailLabel: "Devre Dışı",
    desc: "Otomatik e-posta gönderimini durdur",
    badge: "KAPALI",
  },
];

export interface MailScheduleConfig {
  intervalKey: MailIntervalKey;
  intervalMinutes: number;
  label: string;
  emailLabel: string;
  description: string;
  enabled: boolean;
  onlyTradingHours: boolean;
  updatedAt: string;
}

export const MAIL_SETTINGS_FILE_PATH = path.join(process.cwd(), "mail-settings.md");

export const DEFAULT_MAIL_SETTINGS: MailScheduleConfig = {
  intervalKey: "15m",
  intervalMinutes: 15,
  label: "15 dk",
  emailLabel: "15 Dakikalık",
  description: "Standart seans içi tarama",
  enabled: true,
  onlyTradingHours: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Normalizes any string representation of interval (e.g. "1 saat", "1h", "60", "daily", "günlük")
 * into a matching MailIntervalOption.
 */
export function normalizeIntervalKey(raw: string): MailIntervalOption {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "");

  if (["5m", "5dk", "5dakika", "5min", "5"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[0];
  }
  if (["10m", "10dk", "10dakika", "10min", "10"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[1];
  }
  if (["15m", "15dk", "15dakika", "15min", "15"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[2];
  }
  if (["30m", "30dk", "30dakika", "30min", "30"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[3];
  }
  if (["1h", "1saat", "1s", "60m", "60dk", "60"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[4];
  }
  if (["2h", "2saat", "2s", "120m", "120dk", "120"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[5];
  }
  if (["4h", "4saat", "4s", "240m", "240dk", "240"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[6];
  }
  if (["daily", "gunluk", "günlük", "1gun", "1gün", "1day", "1440"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[7];
  }
  if (["off", "kapali", "kapalı", "devredisi", "devredışı", "false", "0"].includes(clean)) {
    return MAIL_INTERVAL_OPTIONS[8];
  }

  // Fallback: check if minutes integer matches any known option
  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    const matched = MAIL_INTERVAL_OPTIONS.find((o) => o.minutes === num);
    if (matched) return matched;
  }

  return DEFAULT_MAIL_SETTINGS.intervalKey === "15m" ? MAIL_INTERVAL_OPTIONS[2] : MAIL_INTERVAL_OPTIONS[0];
}

/**
 * Parses markdown content of mail-settings.md into MailScheduleConfig.
 */
export function parseMailSettingsMarkdown(content: string): MailScheduleConfig {
  const lines = content.split(/\r?\n/);
  let parsedInterval = "15m";
  let parsedMinutes: number | null = null;
  let parsedEnabled = true;
  let parsedOnlyTradingHours = true;
  let parsedUpdatedAt = new Date().toISOString();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check markdown table: | Key | Value | Notes |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (cols.length < 2) continue;

      const key = cols[0].toLowerCase().replace(/[^a-z0-9ıöüçğş]/gi, "");
      const val = cols[1].trim();

      // Skip header / delimiter
      if (key === "parametre" || key === "key" || key.startsWith("---") || key.startsWith(":")) {
        continue;
      }

      if (key === "sıklık" || key === "siklik" || key === "interval" || key === "frequency") {
        parsedInterval = val;
      } else if (key === "dakika" || key === "minutes") {
        const m = parseInt(val, 10);
        if (!isNaN(m)) parsedMinutes = m;
      } else if (key === "aktif" || key === "enabled" || key === "durum") {
        const lower = val.toLowerCase();
        parsedEnabled = lower === "true" || lower === "evet" || lower === "aktif" || lower === "1";
      } else if (key.includes("seans") || key.includes("tradinghours")) {
        const lower = val.toLowerCase();
        parsedOnlyTradingHours = lower === "true" || lower === "evet" || lower === "1";
      } else if (key.includes("güncelleme") || key.includes("guncelleme") || key.includes("updated")) {
        parsedUpdatedAt = val;
      }
      continue;
    }

    // Check key: value or bullet points: - Sıklık: 1 saat
    const kvMatch = line.match(/^[-*]?\s*\*?([A-Za-z0-9ıöüçğşİÖÜÇĞŞ_ -]+)\*?:\s*(.+)$/i);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase().replace(/[^a-z0-9ıöüçğş]/gi, "");
      const val = kvMatch[2].trim();

      if (key === "sıklık" || key === "siklik" || key === "interval" || key === "frequency") {
        parsedInterval = val;
      } else if (key === "dakika" || key === "minutes") {
        const m = parseInt(val, 10);
        if (!isNaN(m)) parsedMinutes = m;
      } else if (key === "aktif" || key === "enabled") {
        const lower = val.toLowerCase();
        parsedEnabled = lower === "true" || lower === "evet" || lower === "aktif" || lower === "1";
      }
    }
  }

  const opt = normalizeIntervalKey(parsedInterval);
  const minutes = parsedMinutes != null && parsedMinutes > 0 ? parsedMinutes : opt.minutes;

  return {
    intervalKey: opt.key,
    intervalMinutes: minutes,
    label: opt.label,
    emailLabel: opt.emailLabel,
    description: opt.desc,
    enabled: opt.key === "off" ? false : parsedEnabled,
    onlyTradingHours: parsedOnlyTradingHours,
    updatedAt: parsedUpdatedAt,
  };
}

/**
 * Formats MailScheduleConfig into structured Markdown content.
 */
export function formatMailSettingsMarkdown(config: MailScheduleConfig): string {
  const opt = MAIL_INTERVAL_OPTIONS.find((o) => o.key === config.intervalKey) ?? MAIL_INTERVAL_OPTIONS[2];

  return `# E-Posta Gönderim Ayarları

Bu dosya Finans Asistanı otomatik e-posta gönderim sıklığını ve çalışma tercihlerini belirler.
Arayüz üzerinden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan bu dosya düzenlenerek de ayarlanabilir.

| Parametre | Değer | Açıklama |
| --- | --- | --- |
| Sıklık | ${opt.key} | Geçerli sıklık: 5m, 10m, 15m, 30m, 1h, 2h, 4h, daily, off |
| Görünen Ad | ${opt.label} | ${opt.desc} |
| Dakika | ${opt.minutes} | Sayısal dakika karşılığı (0 = devre dışı, 1440 = günlük) |
| Aktif | ${config.enabled && opt.key !== "off" ? "Evet" : "Hayır"} | Otomatik gönderim açık/kapalı |
| Yalnızca Seans İçi | ${config.onlyTradingHours ? "Evet" : "Hayır"} | 09:50 - 18:00 seans saatlerinde çalıştır |
| Son Güncelleme | ${config.updatedAt || new Date().toISOString()} | Son güncelleme zamanı |

---

### Kullanılabilir Sıklık Seçenekleri:
- **5dk** (\`5m\`): Her 5 dakikada bir (Yüksek Sıklık)
- **10dk** (\`10m\`): Her 10 dakikada bir (Hızlı Takip)
- **15dk** (\`15m\`): Her 15 dakikada bir (Standart)
- **30dk** (\`30m\`): Her 30 dakikada bir (Dengeli)
- **1 saat** (\`1h\`): Her 1 saatte bir (Saatlik Özet)
- **2 saat** (\`2h\`): Her 2 saatte bir (2 Saatlik Özet)
- **4 saat** (\`4h\`): Her 4 saatte bir (Yarım Günlük)
- **günlük** (\`daily\`): Günde 1 kez seans saatlerinde
- **kapalı** (\`off\`): Otomatik gönderim kapalı (Yalnızca elle tarama)
`;
}

// In-memory cache to avoid disk reads if not needed
let cachedConfig: MailScheduleConfig | null = null;
let lastFileReadTime = 0;
const CACHE_TTL_MS = 3000; // 3 seconds TTL

/**
 * Reads mail settings from mail-settings.md. Creates default file if not found.
 */
export async function getMailSettingsFromFile(forceFresh = false): Promise<MailScheduleConfig> {
  const now = Date.now();
  if (!forceFresh && cachedConfig && now - lastFileReadTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const content = await fs.readFile(MAIL_SETTINGS_FILE_PATH, "utf-8");
    const parsed = parseMailSettingsMarkdown(content);
    cachedConfig = parsed;
    lastFileReadTime = now;
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveMailSettingsToFile(DEFAULT_MAIL_SETTINGS);
      cachedConfig = DEFAULT_MAIL_SETTINGS;
      lastFileReadTime = now;
      return DEFAULT_MAIL_SETTINGS;
    }
    console.error("[mail-settings-storage] Okuma hatası:", err);
    return cachedConfig || DEFAULT_MAIL_SETTINGS;
  }
}

/**
 * Saves mail settings to mail-settings.md.
 */
export async function saveMailSettingsToFile(
  update: Partial<MailScheduleConfig>
): Promise<MailScheduleConfig> {
  let current: MailScheduleConfig;
  try {
    current = await getMailSettingsFromFile(true);
  } catch {
    current = DEFAULT_MAIL_SETTINGS;
  }

  let intervalKey = update.intervalKey ?? current.intervalKey;
  let intervalOpt = MAIL_INTERVAL_OPTIONS.find((o) => o.key === intervalKey);
  if (!intervalOpt && update.intervalKey) {
    intervalOpt = normalizeIntervalKey(update.intervalKey);
    intervalKey = intervalOpt.key;
  }
  if (!intervalOpt) {
    intervalOpt = MAIL_INTERVAL_OPTIONS[2]; // 15m
    intervalKey = "15m";
  }

  const enabled =
    intervalKey === "off"
      ? false
      : update.enabled !== undefined
      ? update.enabled
      : true;

  const merged: MailScheduleConfig = {
    intervalKey,
    intervalMinutes: intervalOpt.minutes,
    label: intervalOpt.label,
    emailLabel: intervalOpt.emailLabel,
    description: intervalOpt.desc,
    enabled,
    onlyTradingHours: update.onlyTradingHours !== undefined ? update.onlyTradingHours : current.onlyTradingHours,
    updatedAt: new Date().toISOString(),
  };

  const content = formatMailSettingsMarkdown(merged);
  await fs.writeFile(MAIL_SETTINGS_FILE_PATH, content, "utf-8");
  cachedConfig = merged;
  lastFileReadTime = Date.now();

  return merged;
}

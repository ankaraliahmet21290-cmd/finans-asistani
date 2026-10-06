import fs from "fs/promises";
import path from "path";

export type RefreshInterval = 0 | 15 | 30 | 60 | 120 | 300;

export interface RefreshIntervalOption {
  value: RefreshInterval;
  key: string;
  label: string;
  desc: string;
  badge: string;
}

export const REFRESH_INTERVAL_OPTIONS: RefreshIntervalOption[] = [
  {
    value: 15,
    key: "15s",
    label: "15 sn",
    desc: "Çok Hızlı (Gün içi anlık)",
    badge: "15 SN",
  },
  {
    value: 30,
    key: "30s",
    label: "30 sn",
    desc: "Önerilen (Hızlı & Dengeli)",
    badge: "30 SN",
  },
  {
    value: 60,
    key: "60s",
    label: "1 dk",
    desc: "Standart Akış",
    badge: "1 DK",
  },
  {
    value: 120,
    key: "120s",
    label: "2 dk",
    desc: "Düşük Trafik",
    badge: "2 DK",
  },
  {
    value: 300,
    key: "300s",
    label: "5 dk",
    desc: "Tasarruflu",
    badge: "5 DK",
  },
  {
    value: 0,
    key: "off",
    label: "Kapalı",
    desc: "Yalnızca Elle Yenileme",
    badge: "KAPALI",
  },
];

export interface RefreshSettingsConfig {
  seconds: RefreshInterval;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  cacheTtlMs: number;
  updatedAt: string;
}

export const REFRESH_SETTINGS_FILE_PATH = path.join(process.cwd(), "refresh-settings.md");

export const DEFAULT_REFRESH_SETTINGS: RefreshSettingsConfig = {
  seconds: 30,
  key: "30s",
  label: "30 sn",
  description: "Önerilen (Hızlı & Dengeli)",
  enabled: true,
  cacheTtlMs: 30_000,
  updatedAt: new Date().toISOString(),
};

/**
 * Normalizes raw string/number into a valid RefreshInterval.
 */
export function normalizeRefreshInterval(raw: string | number): RefreshIntervalOption {
  const clean = String(raw).trim().toLowerCase().replace(/\s+/g, "");

  if (clean === "15" || clean === "15s" || clean === "15sn") {
    return REFRESH_INTERVAL_OPTIONS[0];
  }
  if (clean === "30" || clean === "30s" || clean === "30sn") {
    return REFRESH_INTERVAL_OPTIONS[1];
  }
  if (clean === "60" || clean === "60s" || clean === "1m" || clean === "1dk") {
    return REFRESH_INTERVAL_OPTIONS[2];
  }
  if (clean === "120" || clean === "120s" || clean === "2m" || clean === "2dk") {
    return REFRESH_INTERVAL_OPTIONS[3];
  }
  if (clean === "300" || clean === "300s" || clean === "5m" || clean === "5dk") {
    return REFRESH_INTERVAL_OPTIONS[4];
  }
  if (clean === "0" || clean === "off" || clean === "kapali" || clean === "kapalı" || clean === "none") {
    return REFRESH_INTERVAL_OPTIONS[5];
  }

  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    if (num <= 0) return REFRESH_INTERVAL_OPTIONS[5];
    if (num <= 20) return REFRESH_INTERVAL_OPTIONS[0];
    if (num <= 45) return REFRESH_INTERVAL_OPTIONS[1];
    if (num <= 90) return REFRESH_INTERVAL_OPTIONS[2];
    if (num <= 180) return REFRESH_INTERVAL_OPTIONS[3];
    return REFRESH_INTERVAL_OPTIONS[4];
  }

  return REFRESH_INTERVAL_OPTIONS[1]; // Default to 30 sn
}

/**
 * Parses markdown table content from refresh-settings.md.
 */
export function parseRefreshSettingsMarkdown(content: string): RefreshSettingsConfig {
  const lines = content.split(/\r?\n/);
  const params: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Table rows: | Parametre | Değer | Açıklama |
    if (line.startsWith("|") && line.endsWith("|")) {
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (parts.length >= 2) {
        const key = parts[0].toLowerCase();
        if (key && !key.startsWith("---") && key !== "parametre") {
          params[key] = parts[1];
        }
      }
      continue;
    }

    // Key-value lines: - Sıklık: 30s
    const kvMatch = line.match(/^[-*]?\s*([^:]+):\s*(.+)$/);
    if (kvMatch) {
      params[kvMatch[1].trim().toLowerCase()] = kvMatch[2].trim();
    }
  }

  const rawVal =
    params["saniye"] ||
    params["sıklık"] ||
    params["siklik"] ||
    params["aralık"] ||
    params["interval"] ||
    params["değer"] ||
    "30s";

  const opt = normalizeRefreshInterval(rawVal);
  const isEnabled = opt.value > 0;
  const updatedAt = params["son güncelleme"] || params["tarih"] || new Date().toISOString();

  return {
    seconds: opt.value,
    key: opt.key,
    label: opt.label,
    description: opt.desc,
    enabled: isEnabled,
    cacheTtlMs: opt.value > 0 ? opt.value * 1000 : 30_000,
    updatedAt,
  };
}

/**
 * Formats a RefreshSettingsConfig into clean Markdown for refresh-settings.md.
 */
export function formatRefreshSettingsMarkdown(config: RefreshSettingsConfig): string {
  const isEnabled = config.seconds > 0;
  const opt = normalizeRefreshInterval(config.seconds);

  return `# Veri Yenileme Ayarları

Bu dosya Finans Asistanı ekranındaki piyasa verilerinin otomatik yenilenme sıklığını ve önbellek (cache) süresini belirler.
Arayüz üzerinden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan bu dosya elle düzenlenerek de ayarlanabilir.

| Parametre | Değer | Açıklama |
| --- | --- | --- |
| Sıklık | ${opt.key} | Geçerli yenileme aralığı: 15s, 30s, 60s, 120s, 300s, off |
| Görünen Ad | ${opt.label} | ${opt.desc} |
| Saniye | ${opt.value} | Sayısal saniye karşılığı (0 = kapalı) |
| Aktif | ${isEnabled ? "Evet" : "Hayır"} | Otomatik veri yenileme açık/kapalı |
| Önbellek Süresi | ${opt.value > 0 ? opt.value : 30} sn | Sunucu veri TTL süresi |
| Son Güncelleme | ${config.updatedAt || new Date().toISOString()} | Son güncelleme zamanı |

---

### Kullanılabilir Yenileme Sıklığı Seçenekleri:
- **15 sn** (\`15s\` / \`15\`): Çok Hızlı (Gün içi anlık)
- **30 sn** (\`30s\` / \`30\`): Önerilen (Hızlı & Dengeli)
- **1 dk** (\`60s\` / \`60\` / \`1m\`): Standart Akış
- **2 dk** (\`120s\` / \`120\` / \`2m\`): Düşük Trafik
- **5 dk** (\`300s\` / \`300\` / \`5m\`): Tasarruflu
- **Kapalı** (\`off\` / \`0\`): Yalnızca Elle Yenileme
`;
}

// In-memory cache for fast synchronous access
let cachedConfig: RefreshSettingsConfig = { ...DEFAULT_REFRESH_SETTINGS };
let hasReadOnce = false;

/**
 * Reads refresh settings from refresh-settings.md. Creates default file if not found.
 */
export async function getRefreshSettingsFromFile(): Promise<RefreshSettingsConfig> {
  try {
    const content = await fs.readFile(REFRESH_SETTINGS_FILE_PATH, "utf-8");
    const parsed = parseRefreshSettingsMarkdown(content);
    cachedConfig = parsed;
    hasReadOnce = true;
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await saveRefreshSettingsToFile(30);
      cachedConfig = { ...DEFAULT_REFRESH_SETTINGS };
      hasReadOnce = true;
      return cachedConfig;
    }
    console.error("[refresh-settings-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

/**
 * Synchronous getter returning the latest cached config for quick server use.
 */
export function getActiveRefreshConfig(): RefreshSettingsConfig {
  if (!hasReadOnce) {
    // Fire-and-forget background read to ensure freshness
    void getRefreshSettingsFromFile();
  }
  return cachedConfig;
}

/**
 * Saves refresh settings to refresh-settings.md.
 */
export async function saveRefreshSettingsToFile(
  seconds: RefreshInterval | string | number
): Promise<RefreshSettingsConfig> {
  const opt = normalizeRefreshInterval(seconds);
  const config: RefreshSettingsConfig = {
    seconds: opt.value,
    key: opt.key,
    label: opt.label,
    description: opt.desc,
    enabled: opt.value > 0,
    cacheTtlMs: opt.value > 0 ? opt.value * 1000 : 30_000,
    updatedAt: new Date().toISOString(),
  };

  const mdContent = formatRefreshSettingsMarkdown(config);
  await fs.writeFile(REFRESH_SETTINGS_FILE_PATH, mdContent, "utf-8");
  cachedConfig = config;
  hasReadOnce = true;
  return config;
}

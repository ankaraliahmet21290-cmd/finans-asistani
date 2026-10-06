import fs from "fs/promises";
import path from "path";
import {
  type RefreshInterval,
  type RefreshIntervalOption,
  type RefreshSettingsConfig,
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_SETTINGS,
  normalizeRefreshInterval,
} from "./refresh-settings-types";

export {
  type RefreshInterval,
  type RefreshIntervalOption,
  type RefreshSettingsConfig,
  REFRESH_INTERVAL_OPTIONS,
  DEFAULT_REFRESH_SETTINGS,
  normalizeRefreshInterval,
};

export const REFRESH_SETTINGS_FILE_PATH = path.join(process.cwd(), "refresh-settings.md");

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

import fs from "fs/promises";
import path from "path";
import {
  type BistSettingsConfig,
  DEFAULT_BIST_SETTINGS,
  normalizeBistSector,
} from "./bist-settings-types";
import { BIST_SECTOR_FILTERS, getBistSectorLabel } from "./bist-sectors";

export * from "./bist-settings-types";

export const BIST_SETTINGS_FILE_PATH = path.join(process.cwd(), "bist-settings.md");

export function parseBistSettingsMarkdown(content: string): BistSettingsConfig {
  const result: BistSettingsConfig = { ...DEFAULT_BIST_SETTINGS };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || !line.endsWith("|")) continue;

    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
    if (parts.length < 3) continue;

    const panel = parts[0].toLowerCase();
    const settingKey = parts[1].toLowerCase();
    if (panel.startsWith("---") || panel === "panel") continue;

    if (
      settingKey.includes("sektör") ||
      settingKey.includes("sector") ||
      settingKey.includes("endeks") ||
      settingKey.includes("kategori")
    ) {
      result.defaultSector = normalizeBistSector(parts[2]);
    }

    if (settingKey.includes("filtre modu") || settingKey.includes("görünüm")) {
      const mode = parts[2].toLowerCase();
      if (mode.includes("potansiyel") || mode.includes("upside")) {
        result.analystFilterMode = "top_upside";
      } else {
        result.analystFilterMode = "leaders";
      }
    }
  }

  const updated = content.match(/Son Güncelleme:\s*([^\s*]+)/);
  if (updated) result.updatedAt = updated[1];

  return result;
}

export function formatBistSettingsMarkdown(config: BistSettingsConfig): string {
  const label = getBistSectorLabel(config.defaultSector) || "🏆 BIST 30 (Likit Hisseler)";

  const options = BIST_SECTOR_FILTERS.map(
    (s) => `- **${s.label}** (\`${s.key}\`): ${s.desc}${s.key === "bist30" ? " (Varsayılan)" : ""}`
  ).join("\n");

  return `# Borsa İstanbul (BIST) Ayarları

Bu dosya, "Borsa İstanbul Hisseleri & Değerleme Tablosu" ve "BIST Analist Konsensüsü & Hedef Fiyatlar" bölümleri için varsayılan sektör ve açılış ayarlarını belirler.
Arayüz üzerinden sektör veya filtre seçildiğinde bu dosya otomatik güncellenir veya doğrudan Genel Ayarlar panelinden elle düzenlenebilir.

| Panel | Ayar | Değer | Görünen Ad |
| --- | --- | --- | --- |
| BIST Değerleme Tablosu | Varsayılan Sektör / Endeks | ${config.defaultSector} | ${label} |
| BIST Analist Konsensüsü | Görünüm Modu | ${config.analystFilterMode || "leaders"} | ${config.analystFilterMode === "top_upside" ? "En Yüksek Potansiyel" : "BIST Liderleri"} |

---

### Kullanılabilir Sektör Seçenekleri:
${options}

*Son Güncelleme: ${config.updatedAt || new Date().toISOString()}*
`;
}

let cachedConfig: BistSettingsConfig = { ...DEFAULT_BIST_SETTINGS };
let hasReadOnce = false;

export async function getBistSettingsFromFile(): Promise<BistSettingsConfig> {
  try {
    const content = await fs.readFile(BIST_SETTINGS_FILE_PATH, "utf-8");
    const parsed = parseBistSettingsMarkdown(content);
    cachedConfig = parsed;
    hasReadOnce = true;
    return parsed;
  } catch (err: unknown) {
    const isEnoent =
      err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT";
    if (isEnoent) {
      const def = { ...DEFAULT_BIST_SETTINGS, updatedAt: new Date().toISOString() };
      try {
        await fs.writeFile(BIST_SETTINGS_FILE_PATH, formatBistSettingsMarkdown(def), "utf-8");
      } catch (writeErr) {
        console.warn("[bist-settings-storage] bist-settings.md oluşturulamadı:", writeErr);
      }
      cachedConfig = def;
      hasReadOnce = true;
      return def;
    }
    if (hasReadOnce) return cachedConfig;
    return { ...DEFAULT_BIST_SETTINGS };
  }
}

export async function saveBistSettingsToFile(
  partial: Partial<BistSettingsConfig>
): Promise<BistSettingsConfig> {
  const current = await getBistSettingsFromFile();
  const next: BistSettingsConfig = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  const md = formatBistSettingsMarkdown(next);
  await fs.writeFile(BIST_SETTINGS_FILE_PATH, md, "utf-8");
  cachedConfig = next;
  hasReadOnce = true;
  return next;
}

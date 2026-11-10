import fs from "fs/promises";
import path from "path";
import { BIST_30_TICKERS, BIST_100_TICKERS, BIST_COMPANIES } from "./bist";
import {
  DEFAULT_INDEX_TYPE,
  INDEX_TYPES,
  INDEX_TYPE_KEYS,
  normalizeIndexTypeKey,
  type IndexTypeKey,
} from "./index-types";

export interface IndexTypeSettingsConfig {
  multiTimeframe: IndexTypeKey;
  topSignals: IndexTypeKey;
  updatedAt: string;
}

export const DEFAULT_INDEX_TYPE_SETTINGS: IndexTypeSettingsConfig = {
  multiTimeframe: DEFAULT_INDEX_TYPE,
  topSignals: DEFAULT_INDEX_TYPE,
  updatedAt: new Date().toISOString(),
};

export const INDEX_TYPE_SETTINGS_FILE_PATH = path.join(process.cwd(), "endeks-tip.md");

/** Seçilen endeksin hisse (ticker) listesini döndürür. */
export function getIndexTickers(indexType: IndexTypeKey): readonly string[] {
  switch (indexType) {
    case "bist100":
      return BIST_100_TICKERS;
    case "bistall":
      return Array.from(new Set(BIST_COMPANIES.map((c) => c.ticker)));
    case "bist30":
    default:
      return BIST_30_TICKERS;
  }
}

export function parseIndexTypeSettingsMarkdown(content: string): IndexTypeSettingsConfig {
  const result: IndexTypeSettingsConfig = { ...DEFAULT_INDEX_TYPE_SETTINGS };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || !line.endsWith("|")) continue;

    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
    if (parts.length < 2) continue;

    const panel = parts[0].toLowerCase();
    if (panel.startsWith("---") || panel === "panel") continue;

    const key = normalizeIndexTypeKey(parts[1]);
    if (panel.includes("lider")) {
      result.topSignals = key;
    } else if (panel.includes("çoklu") || panel.includes("coklu") || panel.includes("zaman")) {
      result.multiTimeframe = key;
    }
  }

  const updated = content.match(/Son Güncelleme:\s*([^\s*]+)/);
  if (updated) result.updatedAt = updated[1];

  return result;
}

export function formatIndexTypeSettingsMarkdown(config: IndexTypeSettingsConfig): string {
  const multi = INDEX_TYPES[config.multiTimeframe];
  const top = INDEX_TYPES[config.topSignals];
  const options = INDEX_TYPE_KEYS.map(
    (k) => `- **${INDEX_TYPES[k].label}** (\`${k}\`): ${INDEX_TYPES[k].description}`
  ).join("\n");

  return `# Endeks Tipi Ayarları

Bu dosya, "Çoklu Zaman Dilimi AL/SAT Taraması" ve "Lider Sinyaller" ekranlarının hangi endeksteki hisseleri tarayacağını belirler.
Arayüzdeki endeks tipi menüsünden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan elle düzenlenebilir.

| Panel | Endeks Kodu | Görünen Ad |
| --- | --- | --- |
| Çoklu Zaman Dilimi Taraması | ${config.multiTimeframe} | ${multi.label} |
| Lider Sinyaller | ${config.topSignals} | ${top.label} |

---

### Kullanılabilir Endeks Tipleri:
${options}

*Son Güncelleme: ${config.updatedAt || new Date().toISOString()}*
`;
}

let cachedConfig: IndexTypeSettingsConfig = { ...DEFAULT_INDEX_TYPE_SETTINGS };

/** endeks-tip.md dosyasını okur; yoksa varsayılanlarla oluşturur. */
export async function getIndexTypeSettingsFromFile(): Promise<IndexTypeSettingsConfig> {
  try {
    const content = await fs.readFile(INDEX_TYPE_SETTINGS_FILE_PATH, "utf-8");
    cachedConfig = parseIndexTypeSettingsMarkdown(content);
    return cachedConfig;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await fs.writeFile(
        INDEX_TYPE_SETTINGS_FILE_PATH,
        formatIndexTypeSettingsMarkdown(DEFAULT_INDEX_TYPE_SETTINGS),
        "utf-8"
      );
      cachedConfig = { ...DEFAULT_INDEX_TYPE_SETTINGS };
      return cachedConfig;
    }
    console.error("[index-type-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

export async function saveIndexTypeSettingsToFile(
  updates: Partial<Pick<IndexTypeSettingsConfig, "multiTimeframe" | "topSignals">>
): Promise<IndexTypeSettingsConfig> {
  const current = await getIndexTypeSettingsFromFile();
  const next: IndexTypeSettingsConfig = {
    multiTimeframe: updates.multiTimeframe
      ? normalizeIndexTypeKey(updates.multiTimeframe)
      : current.multiTimeframe,
    topSignals: updates.topSignals ? normalizeIndexTypeKey(updates.topSignals) : current.topSignals,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(INDEX_TYPE_SETTINGS_FILE_PATH, formatIndexTypeSettingsMarkdown(next), "utf-8");
  cachedConfig = next;
  return next;
}

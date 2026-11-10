import fs from "fs/promises";
import path from "path";
import {
  type UsStockSettingsConfig,
  VALID_US_STOCK_SECTORS,
  DEFAULT_US_STOCK_SETTINGS,
  normalizeUsStockSector,
} from "./us-stock-settings-types";

export * from "./us-stock-settings-types";

export const US_STOCK_SETTINGS_FILE_PATH = path.join(process.cwd(), "us-stock-settings.md");

export function parseUsStockSettingsMarkdown(content: string): UsStockSettingsConfig {
  const result: UsStockSettingsConfig = { ...DEFAULT_US_STOCK_SETTINGS };

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
      settingKey.includes("kategori") ||
      settingKey.includes("category")
    ) {
      result.defaultSector = normalizeUsStockSector(parts[2]);
    }
  }

  const updated = content.match(/Son Güncelleme:\s*([^\s*]+)/);
  if (updated) result.updatedAt = updated[1];

  return result;
}

export function formatUsStockSettingsMarkdown(config: UsStockSettingsConfig): string {
  const label = VALID_US_STOCK_SECTORS[config.defaultSector] || "💻 Yazılım & Bulut";

  const options = Object.entries(VALID_US_STOCK_SECTORS)
    .map(
      ([key, name]) =>
        `- **${name.replace(/^[^\s]+\s*/, "")}** (\`${key}\`): ${
          key === "tech"
            ? "Microsoft, Google, Oracle, Salesforce, Adobe, Palantir, ServiceNow vb. (Varsayılan)"
            : name
        }`
    )
    .join("\n");

  return `# Amerikan Borsası Ayarları

Bu dosya, "Amerikan Borsası Hisseleri & Değerleme Tablosu" ve ABD borsası ekranı (/abd-borsasi) için varsayılan sektör/kategori filtresini belirler.
Arayüz üzerinden sektör seçildiğinde bu dosya otomatik güncellenir veya doğrudan Genel Ayarlar panelinden elle düzenlenebilir.

| Panel | Ayar | Değer | Görünen Ad |
| --- | --- | --- | --- |
| Amerikan Borsası Değerleme Tablosu | Varsayılan Sektör | ${config.defaultSector} | ${label} |

---

### Kullanılabilir Sektör Seçenekleri:
${options}

*Son Güncelleme: ${config.updatedAt || new Date().toISOString()}*
`;
}

let cachedConfig: UsStockSettingsConfig = { ...DEFAULT_US_STOCK_SETTINGS };

/** us-stock-settings.md dosyasını okur; yoksa varsayılanlarla oluşturur. */
export async function getUsStockSettingsFromFile(): Promise<UsStockSettingsConfig> {
  try {
    const content = await fs.readFile(US_STOCK_SETTINGS_FILE_PATH, "utf-8");
    cachedConfig = parseUsStockSettingsMarkdown(content);
    return cachedConfig;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await fs.writeFile(
        US_STOCK_SETTINGS_FILE_PATH,
        formatUsStockSettingsMarkdown(DEFAULT_US_STOCK_SETTINGS),
        "utf-8"
      );
      cachedConfig = { ...DEFAULT_US_STOCK_SETTINGS };
      return cachedConfig;
    }
    console.error("[us-stock-settings-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

export async function saveUsStockSettingsToFile(
  updates: Partial<UsStockSettingsConfig>
): Promise<UsStockSettingsConfig> {
  const current = await getUsStockSettingsFromFile();
  const next: UsStockSettingsConfig = {
    defaultSector: updates.defaultSector
      ? normalizeUsStockSector(updates.defaultSector)
      : current.defaultSector,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(US_STOCK_SETTINGS_FILE_PATH, formatUsStockSettingsMarkdown(next), "utf-8");
  cachedConfig = next;
  return next;
}

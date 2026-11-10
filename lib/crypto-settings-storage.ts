import fs from "fs/promises";
import path from "path";

export interface CryptoSettingsConfig {
  defaultCategory: string;
  updatedAt: string;
}

export const VALID_CRYPTO_CATEGORIES: Record<string, string> = {
  major: "🔥 Liderler",
  all: "🌐 Tümü",
  layer1: "⚡ Ana Ağlar (Layer 1)",
  layer2: "🚀 Hızlandırma & Rollup (Layer 2)",
  ai: "🤖 Yapay Zeka (AI)",
  defi: "🏦 DeFi & Finans",
  meme: "🐕 Meme Coinler",
  gaming: "🎮 Web3 & Oyun",
  infra: "🔒 Altyapı & Gizlilik",
};

export const DEFAULT_CRYPTO_SETTINGS: CryptoSettingsConfig = {
  defaultCategory: "major",
  updatedAt: new Date().toISOString(),
};

export const CRYPTO_SETTINGS_FILE_PATH = path.join(process.cwd(), "crypto-settings.md");

export function normalizeCryptoCategory(raw?: string | null): string {
  if (!raw) return "major";
  const clean = raw.trim().toLowerCase();
  if (VALID_CRYPTO_CATEGORIES[clean]) return clean;
  if (clean === "lider" || clean === "liderler") return "major";
  if (clean === "tumu" || clean === "tümü") return "all";
  return "major";
}

export function parseCryptoSettingsMarkdown(content: string): CryptoSettingsConfig {
  const result: CryptoSettingsConfig = { ...DEFAULT_CRYPTO_SETTINGS };

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

    if (settingKey.includes("kategori") || settingKey.includes("category")) {
      result.defaultCategory = normalizeCryptoCategory(parts[2]);
    }
  }

  const updated = content.match(/Son Güncelleme:\s*([^\s*]+)/);
  if (updated) result.updatedAt = updated[1];

  return result;
}

export function formatCryptoSettingsMarkdown(config: CryptoSettingsConfig): string {
  const label = VALID_CRYPTO_CATEGORIES[config.defaultCategory] || "🔥 Liderler";

  const options = Object.entries(VALID_CRYPTO_CATEGORIES)
    .map(
      ([key, name]) =>
        `- **${name.replace(/^[^\s]+\s*/, "")}** (\`${key}\`): ${
          key === "major" ? "BTC, ETH, SOL, BNB, XRP, AVAX gibi ana kripto varlıklar (Varsayılan)" : name
        }`
    )
    .join("\n");

  return `# Kripto Para Ayarları

Bu dosya, "Tüm Kripto Varlıklar & Karar Destek Skorları" paneli ve kripto ekranı için varsayılan kategori filtresini ve ayarlarını belirler.
Arayüz üzerinden kategori seçildiğinde bu dosya otomatik güncellenir veya doğrudan elle düzenlenebilir.

| Panel | Ayar | Değer | Görünen Ad |
| --- | --- | --- | --- |
| Tüm Kripto Varlıklar & Karar Destek | Varsayılan Kategori | ${config.defaultCategory} | ${label} |

---

### Kullanılabilir Kategori Seçenekleri:
${options}

*Son Güncelleme: ${config.updatedAt || new Date().toISOString()}*
`;
}

let cachedConfig: CryptoSettingsConfig = { ...DEFAULT_CRYPTO_SETTINGS };

/** crypto-settings.md dosyasını okur; yoksa varsayılanlarla oluşturur. */
export async function getCryptoSettingsFromFile(): Promise<CryptoSettingsConfig> {
  try {
    const content = await fs.readFile(CRYPTO_SETTINGS_FILE_PATH, "utf-8");
    cachedConfig = parseCryptoSettingsMarkdown(content);
    return cachedConfig;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      await fs.writeFile(
        CRYPTO_SETTINGS_FILE_PATH,
        formatCryptoSettingsMarkdown(DEFAULT_CRYPTO_SETTINGS),
        "utf-8"
      );
      cachedConfig = { ...DEFAULT_CRYPTO_SETTINGS };
      return cachedConfig;
    }
    console.error("[crypto-settings-storage] Okuma hatası:", err);
    return cachedConfig;
  }
}

export async function saveCryptoSettingsToFile(
  updates: Partial<CryptoSettingsConfig>
): Promise<CryptoSettingsConfig> {
  const current = await getCryptoSettingsFromFile();
  const next: CryptoSettingsConfig = {
    defaultCategory: updates.defaultCategory
      ? normalizeCryptoCategory(updates.defaultCategory)
      : current.defaultCategory,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(CRYPTO_SETTINGS_FILE_PATH, formatCryptoSettingsMarkdown(next), "utf-8");
  cachedConfig = next;
  return next;
}

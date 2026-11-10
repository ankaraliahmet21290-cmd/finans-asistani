export interface UsStockSettingsConfig {
  defaultSector: string;
  updatedAt: string;
}

export const VALID_US_STOCK_SECTORS: Record<string, string> = {
  tech: "💻 Yazılım & Bulut (Yazılım Firmaları)",
  semis: "⚡ Yarı İletken & AI Donanım",
  all: "🌐 Tümü (100+ Dev)",
  finance: "🏦 Finans & Bankacılık",
  crypto_fin: "🪙 Kripto FinTech",
  healthcare: "💊 Sağlık & İlaç",
  consumer: "🛒 Tüketici & Perakende",
  industrial: "✈️ Sanayi & Savunma",
  energy: "🛢️ Enerji & Petrol",
  media: "🎬 İletişim & Medya",
};

export const DEFAULT_US_STOCK_SETTINGS: UsStockSettingsConfig = {
  defaultSector: "tech", // Varsayılan: Yazılım firmaları
  updatedAt: new Date().toISOString(),
};

export function normalizeUsStockSector(raw?: string | null): string {
  if (!raw) return "tech";
  const clean = raw.trim().toLowerCase();
  if (VALID_US_STOCK_SECTORS[clean]) return clean;
  if (clean.includes("yazilim") || clean.includes("yazılım") || clean.includes("software")) return "tech";
  if (clean.includes("yari") || clean.includes("yarı") || clean.includes("semi")) return "semis";
  if (clean.includes("tumu") || clean.includes("tümü") || clean === "all") return "all";
  if (clean.includes("finans") || clean.includes("banka")) return "finance";
  if (clean.includes("saglik") || clean.includes("sağlık") || clean.includes("health")) return "healthcare";
  if (clean.includes("tuketici") || clean.includes("tüketici") || clean.includes("consumer")) return "consumer";
  if (clean.includes("sanayi") || clean.includes("savunma")) return "industrial";
  if (clean.includes("enerji") || clean.includes("petrol")) return "energy";
  if (clean.includes("medya") || clean.includes("iletisim")) return "media";
  if (clean.includes("kripto")) return "crypto_fin";
  return "tech";
}

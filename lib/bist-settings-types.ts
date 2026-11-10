import type { BistSectorKey } from "./bist-sectors";

export interface BistSettingsConfig {
  defaultSector: BistSectorKey;
  analystFilterMode?: "leaders" | "top_upside";
  updatedAt: string;
}

export const DEFAULT_BIST_SETTINGS: BistSettingsConfig = {
  defaultSector: "bist30", // Kullanıcı tercihi: Varsayılan BIST 30
  analystFilterMode: "leaders",
  updatedAt: new Date().toISOString(),
};

export function normalizeBistSector(raw?: string | null): BistSectorKey {
  if (!raw) return "bist30";
  const clean = raw.trim().toLowerCase();
  const validKeys: BistSectorKey[] = [
    "bist30",
    "bist100",
    "all",
    "bistall",
    "banka",
    "sanayi",
    "holding",
    "enerji",
    "havacilik",
    "teknoloji",
    "perakende",
    "telekom",
    "gyo",
    "diger",
  ];
  if (validKeys.includes(clean as BistSectorKey)) {
    return clean === "bistall" ? "all" : (clean as BistSectorKey);
  }
  if (clean.includes("30")) return "bist30";
  if (clean.includes("100")) return "bist100";
  if (clean.includes("tum") || clean.includes("tüm") || clean === "all") return "all";
  if (clean.includes("bank")) return "banka";
  if (clean.includes("sanayi") || clean.includes("uretim") || clean.includes("üretim")) return "sanayi";
  if (clean.includes("hold") || clean.includes("yatirim") || clean.includes("yatırım")) return "holding";
  if (clean.includes("enerj") || clean.includes("petrol")) return "enerji";
  if (clean.includes("hava") || clean.includes("loji")) return "havacilik";
  if (clean.includes("tekno") || clean.includes("savunma")) return "teknoloji";
  if (clean.includes("pera") || clean.includes("gida") || clean.includes("gıda")) return "perakende";
  if (clean.includes("telekom") || clean.includes("iletisim")) return "telekom";
  if (clean.includes("gyo") || clean.includes("gayrimenkul")) return "gyo";
  return "bist30";
}

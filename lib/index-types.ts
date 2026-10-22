/**
 * Endeks tipi tanımları (istemci ve sunucu ortak kullanır, fs içermez).
 * Yeni endeks eklemek için buraya anahtar ekleyip lib/index-type-storage.ts
 * içindeki getIndexTickers fonksiyonuna bileşen listesini bağlamak yeterlidir.
 */
export type IndexTypeKey = "bist30" | "bist100" | "bistall";

export interface IndexTypeInfo {
  label: string;
  description: string;
}

export const INDEX_TYPES: Record<IndexTypeKey, IndexTypeInfo> = {
  bist30: {
    label: "BIST 30",
    description: "BIST 30 endeksindeki likit hisseler",
  },
  bist100: {
    label: "BIST 100",
    description: "BIST 100 endeksindeki şirketler (canlı XU100)",
  },
  bistall: {
    label: "BIST TÜM",
    description: "Borsa İstanbul'daki tüm şirketler (yavaş tarama)",
  },
};

export const INDEX_TYPE_KEYS = Object.keys(INDEX_TYPES) as IndexTypeKey[];

export const DEFAULT_INDEX_TYPE: IndexTypeKey = "bist30";

function foldKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ü/g, "u")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

/** "BIST 30", "bist30", "BIST 100", "bist100", "BIST TÜM" gibi girdileri geçerli bir anahtara çevirir. */
export function normalizeIndexTypeKey(raw?: string | null): IndexTypeKey {
  if (!raw) return DEFAULT_INDEX_TYPE;
  const folded = foldKey(raw);
  if (folded === "bist30") return "bist30";
  if (folded === "bist100" || folded === "xu100" || folded === "100") return "bist100";
  if (folded === "bisttum" || folded === "bistall" || folded === "tum") return "bistall";
  return DEFAULT_INDEX_TYPE;
}

import bistCompaniesData from "./bist-companies.json";

export interface BistCompany {
  code: string;
  ticker: string;
  name: string;
  city?: string;
}

export const BIST_COMPANIES: readonly BistCompany[] = bistCompaniesData as BistCompany[];

// Prominent BIST 30 tickers used for market overview and top buy/sell rankings
export const BIST_30_TICKERS: readonly string[] = [
  "THYAO.IS",
  "ASELS.IS",
  "GARAN.IS",
  "AKBNK.IS",
  "ISCTR.IS",
  "YKBNK.IS",
  "KCHOL.IS",
  "SAHOL.IS",
  "BIMAS.IS",
  "TUPRS.IS",
  "EREGL.IS",
  "SISE.IS",
  "FROTO.IS",
  "TOASO.IS",
  "PETKM.IS",
  "ENKAI.IS",
  "PGSUS.IS",
  "TCELL.IS",
  "TTKOM.IS",
  "TAVHL.IS",
  "EKGYO.IS",
  "ASTOR.IS",
  "OYAKC.IS",
  "ALARK.IS",
  "GUBRF.IS",
  "KRDMD.IS",
  "SASA.IS",
  "HEKTS.IS",
  "VESTL.IS",
  "ARCLK.IS",
] as const;

export function normalizeTurkish(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/i̇/g, "i")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

const companyByCode = new Map<string, BistCompany>();
const companyByTicker = new Map<string, BistCompany>();

for (const c of BIST_COMPANIES) {
  companyByCode.set(c.code.toUpperCase(), c);
  companyByTicker.set(c.ticker.toUpperCase(), c);
}

export function findBistCompany(query: string): BistCompany | undefined {
  const clean = query.trim().toUpperCase();
  const withoutIS = clean.replace(/\.IS$/, "");
  const withIS = withoutIS + ".IS";

  return companyByTicker.get(withIS) || companyByCode.get(withoutIS) || companyByCode.get(clean);
}

export function isBistTicker(ticker: string): boolean {
  return ticker.endsWith(".IS") || findBistCompany(ticker) !== undefined;
}

export function searchBistCompanies(query: string, limit = 20): BistCompany[] {
  const q = normalizeTurkish(query);
  if (!q) {
    // Return popular/major stocks by default
    return BIST_30_TICKERS.map((t) => findBistCompany(t))
      .filter((c): c is BistCompany => Boolean(c))
      .slice(0, limit);
  }

  // Exact code matches first, then prefix code matches, then name matches
  const exactCodeMatches: BistCompany[] = [];
  const prefixCodeMatches: BistCompany[] = [];
  const nameMatches: BistCompany[] = [];

  for (const c of BIST_COMPANIES) {
    const codeNorm = normalizeTurkish(c.code);
    const nameNorm = normalizeTurkish(c.name);

    if (codeNorm === q) {
      exactCodeMatches.push(c);
    } else if (codeNorm.startsWith(q)) {
      prefixCodeMatches.push(c);
    } else if (nameNorm.includes(q) || codeNorm.includes(q)) {
      nameMatches.push(c);
    }

    if (exactCodeMatches.length + prefixCodeMatches.length + nameMatches.length >= limit * 2) {
      break;
    }
  }

  return [...exactCodeMatches, ...prefixCodeMatches, ...nameMatches].slice(0, limit);
}

const BANK_FINANCIAL_CODES = new Set([
  "GARAN",
  "AKBNK",
  "ISCTR",
  "YKBNK",
  "VAKBN",
  "HALKB",
  "ALBRK",
  "TSKB",
  "SKBNK",
  "QNBFB",
  "KLNMA",
  "ICBCT",
]);

export function isFinancialOrBank(query: string): boolean {
  const clean = query.trim().toUpperCase().replace(/\.IS$/, "");
  return BANK_FINANCIAL_CODES.has(clean);
}


import { BIST_30_TICKERS, BIST_100_TICKERS } from "./bist";

export type BistSectorKey =
  | "all"
  | "bistall"
  | "bist100"
  | "bist30"
  | "banka"
  | "sanayi"
  | "holding"
  | "enerji"
  | "havacilik"
  | "teknoloji"
  | "perakende"
  | "telekom"
  | "gyo"
  | "diger";

export interface BistSectorFilter {
  key: BistSectorKey;
  label: string;
  icon: string;
  desc: string;
}

export const BIST_SECTOR_FILTERS: readonly BistSectorFilter[] = [
  { key: "all", label: "BIST TÜM", icon: "🇹🇷", desc: "Tüm Borsa İstanbul şirketleri" },
  { key: "bist100", label: "BIST 100", icon: "📊", desc: "BIST 100 endeksi şirketleri" },
  { key: "bist30", label: "BIST 30", icon: "🏆", desc: "Borsa İstanbul'un en likit 30 lider şirketi" },
  { key: "banka", label: "Bankacılık & Finans", icon: "🏦", desc: "Bankalar, sigorta ve aracı kurumlar" },
  { key: "sanayi", label: "Sanayi & Üretim", icon: "🏗️", desc: "Otomotiv, demir-çelik, beyaz eşya ve cam" },
  { key: "holding", label: "Holding & Yatırım", icon: "🏛️", desc: "Koç, Sabancı, Anadolu Grubu ve diğer holdingler" },
  { key: "enerji", label: "Enerji & Petrol", icon: "⚡", desc: "Rafineri, petrokimya, elektrik ve yenilenebilir enerji" },
  { key: "havacilik", label: "Havacılık & Lojistik", icon: "✈️", desc: "Havayolları, havalimanı işletmeciliği ve taşımacılık" },
  { key: "teknoloji", label: "Teknoloji & Savunma", icon: "💻", desc: "Savunma sanayii, yazılım ve teknoloji şirketleri" },
  { key: "perakende", label: "Perakende & Tüketim", icon: "🛒", desc: "Market zincirleri, gıda ve içecek devleri" },
  { key: "telekom", label: "Telekomünikasyon", icon: "📡", desc: "Mobil iletişim ve telekom altyapısı" },
  { key: "gyo", label: "GYO & Gayrimenkul", icon: "🏢", desc: "Gayrimenkul yatırım ortaklıkları ve inşaat" },
  { key: "diger", label: "Diğer", icon: "🌐", desc: "Diğer sektörlerde faaliyet gösteren şirketler" },
] as const;

const BIST_30_SET = new Set(BIST_30_TICKERS.map((t) => t.toUpperCase()));
const BIST_100_SET = new Set(BIST_100_TICKERS.map((t) => t.toUpperCase()));

export function isBist30(ticker: string): boolean {
  const clean = ticker.trim().toUpperCase();
  const withIS = clean.endsWith(".IS") ? clean : `${clean}.IS`;
  return BIST_30_SET.has(withIS);
}

export function isBist100(ticker: string): boolean {
  const clean = ticker.trim().toUpperCase();
  const withIS = clean.endsWith(".IS") ? clean : `${clean}.IS`;
  return BIST_100_SET.has(withIS);
}

const SECTOR_MAPPING: Record<string, BistSectorKey> = {
  // Bankacılık & Finans
  GARAN: "banka",
  AKBNK: "banka",
  ISCTR: "banka",
  YKBNK: "banka",
  VAKBN: "banka",
  HALKB: "banka",
  ALBRK: "banka",
  TSKB: "banka",
  SKBNK: "banka",
  QNBFB: "banka",
  KLNMA: "banka",
  ICBCT: "banka",
  ISMEN: "banka",
  ANHYT: "banka",
  ANSGR: "banka",
  TURSG: "banka",

  // Sanayi & Üretim
  EREGL: "sanayi",
  KRDMD: "sanayi",
  ISDMR: "sanayi",
  FROTO: "sanayi",
  TOASO: "sanayi",
  ARCLK: "sanayi",
  VESTL: "sanayi",
  SISE: "sanayi",
  CIMSA: "sanayi",
  AKCNS: "sanayi",
  BTCIM: "sanayi",
  OYAKC: "sanayi",
  LMKDC: "sanayi",
  BRSAN: "sanayi",
  KCAER: "sanayi",
  KORDS: "sanayi",
  SASA: "sanayi",
  AKSA: "sanayi",
  TTRAK: "sanayi",
  DOAS: "sanayi",
  KARSN: "sanayi",
  EGEEN: "sanayi",
  CVKMD: "sanayi",
  EUREN: "sanayi",
  GUBRF: "sanayi",
  HEKTS: "sanayi",
  EGGUB: "sanayi",
  ECILC: "sanayi",
  TCKRC: "sanayi",
  TRALT: "sanayi",
  TRMET: "sanayi",

  // Holding & Yatırım
  KCHOL: "holding",
  SAHOL: "holding",
  AGHOL: "holding",
  ALARK: "holding",
  ENKAI: "holding",
  DOHOL: "holding",
  BERA: "holding",
  BINHO: "holding",
  BRYAT: "holding",
  ECZYT: "holding",
  GLYHO: "holding",
  PAHOL: "holding",
  TKFEN: "holding",
  GLRMK: "holding",

  // Enerji & Petrol
  TUPRS: "enerji",
  PETKM: "enerji",
  ASTOR: "enerji",
  AKSEN: "enerji",
  ENJSA: "enerji",
  CWENE: "enerji",
  ENERY: "enerji",
  ENTRA: "enerji",
  GWIND: "enerji",
  ODAS: "enerji",
  ZOREN: "enerji",
  CANTE: "enerji",
  AHGAZ: "enerji",
  AKFYE: "enerji",
  AYGAZ: "enerji",
  TRENJ: "enerji",

  // Havacılık & Lojistik
  THYAO: "havacilik",
  PGSUS: "havacilik",
  TAVHL: "havacilik",
  CLEBI: "havacilik",
  RYSAS: "havacilik",
  GRSEL: "havacilik",

  // Teknoloji & Savunma
  ASELS: "teknoloji",
  ALTNY: "teknoloji",
  KATMR: "teknoloji",
  OTKAR: "teknoloji",
  LOGO: "teknoloji",
  MIATK: "teknoloji",
  REEDR: "teknoloji",
  VBTYZ: "teknoloji",

  // Perakende & Tüketim
  BIMAS: "perakende",
  MGROS: "perakende",
  SOKM: "perakende",
  CCOLA: "perakende",
  AEFES: "perakende",
  ULKER: "perakende",
  TABGD: "perakende",
  TUKAS: "perakende",
  MAVI: "perakende",
  OBAMS: "perakende",
  MPARK: "perakende",
  ADEL: "perakende",
  FENER: "perakende",

  // Telekom
  TCELL: "telekom",
  TTKOM: "telekom",

  // GYO & Gayrimenkul
  EKGYO: "gyo",
  ISGYO: "gyo",
  TRGYO: "gyo",
  RGYAS: "gyo",
  SNGYO: "gyo",
  AAGYO: "gyo",
};

export function getBistSector(ticker: string, code?: string): BistSectorKey {
  const c = (code || ticker).toUpperCase().replace(/\.IS$/, "");
  return SECTOR_MAPPING[c] ?? "diger";
}

export function getBistSectorLabel(key: BistSectorKey): string {
  const found = BIST_SECTOR_FILTERS.find((f) => f.key === key);
  return found ? found.label : "Diğer";
}

export interface MarketItem {
  ticker: string;
  name: string;
  category: "bist" | "commodity" | "forex" | "crypto" | "us_stock";
  currency: string;
  unit?: string;
  description?: string;
  icon?: string;
}

export interface MarketConfig {
  id: "bist" | "commodity_forex" | "crypto" | "us_stocks";
  name: string;
  shortName: string;
  path: string;
  icon: string;
  tradingHours: string;
  description: string;
  featuredTickers: readonly string[];
}

import { ALL_CRYPTO_TICKERS, CRYPTO_ASSETS, findCryptoAsset } from "./crypto-assets";

export const MARKETS: readonly MarketConfig[] = [
  {
    id: "bist",
    name: "Borsa İstanbul",
    shortName: "BIST",
    path: "/",
    icon: "🇹🇷",
    tradingHours: "09:50 - 18:00",
    description: "BIST 100 & 30 hisseleri, çoklu zaman dilimi AL/SAT sinyalleri ve bilanço analizi.",
    featuredTickers: ["THYAO.IS", "ASELS.IS", "GARAN.IS", "EREGL.IS", "BIMAS.IS", "TUPRS.IS", "KCHOL.IS", "SISE.IS", "AKBNK.IS", "FROTO.IS"],
  },
  {
    id: "commodity_forex",
    name: "Emtia & Döviz",
    shortName: "Emtia / Döviz",
    path: "/emtia-doviz",
    icon: "🥇",
    tradingHours: "Hafta İçi 24s",
    description: "Altın (Gram & Ons), Gümüş, Dolar/TL, Euro/TL, Petrol, Dolar Endeksi ve Pivot Seviyeleri.",
    featuredTickers: ["GC=F", "USDTRY=X", "EURTRY=X", "SI=F", "EURUSD=X", "BZ=F", "CL=F", "DX-Y.NYB", "HG=F", "^TNX"],
  },
  {
    id: "crypto",
    name: "Kripto Para",
    shortName: "Kripto",
    path: "/kripto",
    icon: "🪙",
    tradingHours: "7/24 Kesintisiz",
    description: "Bitcoin, Ethereum, Solana, Layer 1/2, AI, DeFi ve meme paralar için 7/24 Supertrend & Stoch RSI sinyalleri.",
    featuredTickers: ALL_CRYPTO_TICKERS,
  },
  {
    id: "us_stocks",
    name: "Amerikan Borsası",
    shortName: "ABD Borsası",
    path: "/abd-borsasi",
    icon: "🇺🇸",
    tradingHours: "16:30 - 23:00 TSİ",
    description: "S&P 500 & Nasdaq devleri: Nvidia, Apple, Microsoft, Tesla ve Wall Street analist hedef fiyatları.",
    featuredTickers: ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "PLTR"],
  },
] as const;

export const CURATED_MARKET_ITEMS: Record<string, MarketItem> = {
  // --- Emtia & Döviz ---
  "GC=F": { ticker: "GC=F", name: "Ons Altın (USD)", category: "commodity", currency: "USD", unit: "oz", icon: "🥇" },
  "SI=F": { ticker: "SI=F", name: "Gümüş Vadeli (USD)", category: "commodity", currency: "USD", unit: "oz", icon: "🥈" },
  "USDTRY=X": { ticker: "USDTRY=X", name: "Amerikan Doları / TL", category: "forex", currency: "TRY", icon: "💵" },
  "EURTRY=X": { ticker: "EURTRY=X", name: "Euro / TL", category: "forex", currency: "TRY", icon: "💶" },
  "EURUSD=X": { ticker: "EURUSD=X", name: "EUR / USD Paritesi", category: "forex", currency: "USD", icon: "🇪🇺" },
  "BZ=F": { ticker: "BZ=F", name: "Brent Petrol", category: "commodity", currency: "USD", unit: "varil", icon: "🛢️" },
  "CL=F": { ticker: "CL=F", name: "Ham Petrol (WTI)", category: "commodity", currency: "USD", unit: "varil", icon: "⛽" },
  "HG=F": { ticker: "HG=F", name: "Bakır Vadeli", category: "commodity", currency: "USD", unit: "lb", icon: "🥉" },
  "DX-Y.NYB": { ticker: "DX-Y.NYB", name: "Dolar Endeksi (DXY)", category: "forex", currency: "USD", icon: "🌐" },
  "^TNX": { ticker: "^TNX", name: "ABD 10 Yıllık Tahvil Getirisi", category: "forex", currency: "%", icon: "📈" },

  // --- Kripto Paralar (Tüm Ekosistem: 80+ Varlık) ---
  ...Object.fromEntries(
    CRYPTO_ASSETS.map((c) => [
      c.ticker,
      {
        ticker: c.ticker,
        name: c.name,
        category: "crypto" as const,
        currency: c.currency,
        description: c.description,
        icon: c.icon,
      },
    ])
  ),

  // --- ABD Borsası ---
  "NVDA": { ticker: "NVDA", name: "NVIDIA Corp.", category: "us_stock", currency: "USD", description: "Yapay zeka & yarı iletken devi", icon: "🟢" },
  "AAPL": { ticker: "AAPL", name: "Apple Inc.", category: "us_stock", currency: "USD", description: "Tüketici teknolojisi & donanım", icon: "🍎" },
  "MSFT": { ticker: "MSFT", name: "Microsoft Corp.", category: "us_stock", currency: "USD", description: "Bulut bilişim & yazılım", icon: "🪟" },
  "AMZN": { ticker: "AMZN", name: "Amazon.com Inc.", category: "us_stock", currency: "USD", description: "E-ticaret & AWS bulut", icon: "📦" },
  "GOOGL": { ticker: "GOOGL", name: "Alphabet (Google)", category: "us_stock", currency: "USD", description: "Arama motoru & yapay zeka", icon: "🔍" },
  "META": { ticker: "META", name: "Meta Platforms", category: "us_stock", currency: "USD", description: "Sosyal medya & metaverse", icon: "♾️" },
  "TSLA": { ticker: "TSLA", name: "Tesla Inc.", category: "us_stock", currency: "USD", description: "Elektrikli araç & otonom sürüş", icon: "⚡" },
  "AMD": { ticker: "AMD", name: "Advanced Micro Devices", category: "us_stock", currency: "USD", description: "Yarı iletken & işlemci", icon: "🔴" },
  "NFLX": { ticker: "NFLX", name: "Netflix Inc.", category: "us_stock", currency: "USD", description: "Yayıncılık & eğlence", icon: "🎬" },
  "PLTR": { ticker: "PLTR", name: "Palantir Tech.", category: "us_stock", currency: "USD", description: "Büyük veri & savunma yazılımı", icon: "🎯" },
};

/**
 * Verilen sembolün hangi varlık türüne ait olduğunu çözer.
 */
export function detectAssetCategory(ticker: string): "stock" | "gold" | "commodity" | "forex" | "crypto" | "us_stock" {
  const upper = ticker.toUpperCase().trim();
  if (upper === "GC=F" || upper === "ALTIN" || upper.includes("GOLD")) return "gold";
  if (upper === "SI=F" || upper === "BZ=F" || upper === "CL=F" || upper === "HG=F" || upper === "PL=F") return "commodity";
  if (upper.endsWith("=X") || upper === "DX-Y.NYB" || upper === "^TNX") return "forex";
  if (findCryptoAsset(upper) || upper.endsWith("-USD") || upper.endsWith("-TRY") || upper.endsWith("-USDT")) return "crypto";
  if (upper.endsWith(".IS")) return "stock";
  if (CURATED_MARKET_ITEMS[upper]?.category === "us_stock") return "us_stock";
  if (upper.match(/^[A-Z]{1,5}$/)) {
    // 1-5 harfli nokta içermeyen semboller ABD hissesi kabul edilir (AAPL, MSFT vb.)
    return "us_stock";
  }
  return "stock";
}

/**
 * Piyasa açık/kapalı durumu kontrolü (Türkiye Yerel Saati UTC+3)
 */
export function getMarketSessionStatus(marketId: "bist" | "commodity_forex" | "crypto" | "us_stocks"): {
  isOpen: boolean;
  statusText: string;
  badgeColor: string;
} {
  const now = new Date();
  // UTC+3 Türkiye saati
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const trHours = (utcHours + 3) % 24;
  const currentMinuteOfDay = trHours * 60 + utcMinutes;
  const dayOfWeek = now.getUTCDay(); // 0: Pazar, 6: Cumartesi

  if (marketId === "crypto") {
    return {
      isOpen: true,
      statusText: "7/24 Açık (Kesintisiz)",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    };
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (marketId === "bist") {
    // Hafta içi 09:50 - 18:05
    const openMinute = 9 * 60 + 50;
    const closeMinute = 18 * 60 + 5;
    const isOpen = !isWeekend && currentMinuteOfDay >= openMinute && currentMinuteOfDay <= closeMinute;
    return {
      isOpen,
      statusText: isOpen ? "Seans Açık (09:50 - 18:00)" : "Seans Kapalı (Açılış: 09:50)",
      badgeColor: isOpen
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-zinc-700 bg-zinc-800/80 text-zinc-400",
    };
  }

  if (marketId === "us_stocks") {
    // ABD Borsası TSİ 16:30 - 23:00 hafta içi
    const openMinute = 16 * 60 + 30;
    const closeMinute = 23 * 60;
    const isOpen = !isWeekend && currentMinuteOfDay >= openMinute && currentMinuteOfDay <= closeMinute;
    return {
      isOpen,
      statusText: isOpen ? "ABD Seansı Açık (16:30 - 23:00)" : "ABD Seansı Kapalı (Açılış: 16:30)",
      badgeColor: isOpen
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-zinc-700 bg-zinc-800/80 text-zinc-400",
    };
  }

  if (marketId === "commodity_forex") {
    // Küresel FX & Emtia: Hafta sonu hariç 24 saat açık
    const isOpen = !isWeekend;
    return {
      isOpen,
      statusText: isOpen ? "Küresel Piyasa Açık (24s)" : "Hafta Sonu Kapalı (Açılış: Pzt)",
      badgeColor: isOpen
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-zinc-700 bg-zinc-800/80 text-zinc-400",
    };
  }

  return {
    isOpen: true,
    statusText: "Açık",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
}

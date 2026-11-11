/**
 * TradingView symbol resolver, asset catalog and utilities.
 * Maps local / Yahoo Finance tickers to official TradingView symbol formats.
 * Provides comprehensive multi-market asset search for BIST, US, Crypto, Commodities, Forex, and Indices.
 */

import { findUsStockAsset, US_STOCK_ASSETS } from "./us-stock-assets";
import { findBistCompany, isBistTicker, BIST_COMPANIES, normalizeTurkish } from "./bist";
import { findCryptoAsset, CRYPTO_ASSETS } from "./crypto-assets";
import { CURATED_MARKET_ITEMS } from "./markets";

export interface TradingViewAssetItem {
  symbol: string;        // TradingView symbol e.g. "BIST:THYAO"
  ticker: string;        // Finans Asistanı ticker e.g. "THYAO.IS"
  code: string;          // Short code e.g. "THYAO"
  name: string;          // Human name e.g. "Türk Hava Yolları"
  category: "bist" | "us_stock" | "crypto" | "commodity" | "forex" | "index";
  categoryLabel: string; // e.g. "🇹🇷 BIST", "🇺🇸 ABD", "🪙 Kripto", "🥇 Emtia", "💵 Döviz", "📈 Endeks"
  exchange: string;      // e.g. "BIST", "NASDAQ", "NYSE", "BINANCE", "OANDA", "FX", "TVC"
  icon?: string;
}

/**
 * Resolves any input ticker / symbol / search term to official TradingView format
 */
export function toTradingViewSymbol(ticker: string, type?: string): string {
  if (!ticker) return "BIST:THYAO";

  // Clean whitespace, slashes, backslashes
  let clean = ticker.trim().toUpperCase().replace(/[\/\\ ]/g, "");

  // If already prefixed with exchange (e.g. BIST:THYAO, NASDAQ:AAPL, BINANCE:BTCUSDT)
  if (clean.includes(":")) {
    return clean;
  }

  // 1. BIST Stocks & Indices ending in .IS
  if (clean.endsWith(".IS")) {
    const raw = clean.replace(/\.IS$/, "");
    if (raw === "XU100" || raw === "BIST100") return "BIST:XU100";
    if (raw === "XU030" || raw === "BIST30") return "BIST:XU030";
    if (raw === "XBANK") return "BIST:XBANK";
    if (raw === "ALTINS1" || raw === "ALTIN.S1") return "BIST:ALTINS1";
    return `BIST:${raw}`;
  }

  // 2. Turkish Macro / BIST Indices
  if (clean === "XU100" || clean === "BIST100" || clean === "BIST 100") return "BIST:XU100";
  if (clean === "XU030" || clean === "BIST30" || clean === "BIST 30") return "BIST:XU030";
  if (clean === "XBANK" || clean === "BISTBANKA") return "BIST:XBANK";

  // 3. Gold & Precious Metals
  if (
    clean === "ALTIN.S1" ||
    clean === "ALTINS1" ||
    clean === "GRAMALTIN" ||
    clean === "GRAM_ALTIN" ||
    clean === "GRAM ALTIN"
  ) {
    return "BIST:ALTINS1"; // Borsa İstanbul Darphane Altın Sertifikası
  }
  if (
    clean === "GC=F" ||
    clean === "XAUUSD" ||
    clean === "GOLD" ||
    clean === "ALTIN" ||
    clean === "ONSALTIN" ||
    clean === "ONS_ALTIN"
  ) {
    return "OANDA:XAUUSD";
  }
  if (clean === "SI=F" || clean === "XAGUSD" || clean === "SILVER" || clean === "GUMUS") {
    return "OANDA:XAGUSD";
  }
  if (clean === "HG=F" || clean === "COPPER" || clean === "BAKIR") {
    return "COMEX:HG1!";
  }
  if (clean === "PL=F" || clean === "PLATINUM" || clean === "PLATIN") {
    return "NYMEX:PL1!";
  }

  // 4. Energy & Commodities
  if (clean === "BZ=F" || clean === "UKOIL" || clean === "BRENT") return "TVC:UKOIL";
  if (clean === "CL=F" || clean === "USOIL" || clean === "WTI" || clean === "PETROL") return "TVC:USOIL";
  if (clean === "NG=F" || clean === "NATGAS" || clean === "DOGALGAZ") return "NYMEX:NG1!";

  // 5. Currencies / Forex
  if (clean === "USDTRY=X" || clean === "USDTRY" || clean === "DOLAR") return "FX:USDTRY";
  if (clean === "EURTRY=X" || clean === "EURTRY" || clean === "EURO" || clean === "AVRO") return "FX:EURTRY";
  if (clean === "EURUSD=X" || clean === "EURUSD") return "FX:EURUSD";
  if (clean === "GBPTRY=X" || clean === "GBPTRY" || clean === "STERLIN") return "FX:GBPTRY";
  if (clean === "GBPAUD=X" || clean === "GBPAUD") return "FX:GBPAUD";
  if (clean === "USDJPY=X" || clean === "USDJPY") return "FX:USDJPY";
  if (clean.endsWith("=X")) return `FX:${clean.replace(/=X$/, "")}`;

  // 6. Macro / Global Indices
  if (clean === "^TNX" || clean === "US10Y" || clean === "TNX") return "TVC:US10Y";
  if (clean === "DX-Y.NYB" || clean === "DXY") return "TVC:DXY";
  if (clean === "^GSPC" || clean === "SPX" || clean === "SP500" || clean === "S&P500") return "S&P:SPX";
  if (clean === "^IXIC" || clean === "IXIC" || clean === "NASDAQ" || clean === "NDX") return "NASDAQ:IXIC";
  if (clean === "^DJI" || clean === "DJI" || clean === "DOW") return "DJ:DJI";
  if (clean === "^VIX" || clean === "VIX") return "CBOE:VIX";
  if (clean === "DAX" || clean === "^GDAXI") return "XETR:DAX";

  // 7. Crypto Coins
  if (clean.endsWith("-USD")) {
    const coin = clean.replace(/-USD$/, "");
    return `BINANCE:${coin}USDT`;
  }
  if (clean.endsWith("-USDT")) {
    const coin = clean.replace(/-USDT$/, "");
    return `BINANCE:${coin}USDT`;
  }
  if (clean.endsWith("-TRY")) {
    const coin = clean.replace(/-TRY$/, "");
    return `BINANCE:${coin}TRY`;
  }
  if (clean.endsWith("USDT")) {
    return `BINANCE:${clean}`;
  }

  // Check known crypto asset catalog
  const cryptoAsset = findCryptoAsset(clean);
  if (cryptoAsset || type === "crypto") {
    const coin = cryptoAsset?.code ?? clean;
    return `BINANCE:${coin}USDT`;
  }

  // Common crypto short aliases
  const CRYPTO_ALIASES = new Set([
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT", "LINK", "MATIC",
    "NEAR", "SHIB", "UNI", "LTC", "BCH", "SUI", "APT", "FET", "RENDER", "INJ",
    "TIA", "ICP", "TRX", "TON", "PEPE", "BNB"
  ]);
  if (CRYPTO_ALIASES.has(clean)) {
    return `BINANCE:${clean}USDT`;
  }

  // 8. US Stocks (Explicit & Curated)
  if (clean === "BRK-B" || clean === "BRK.B" || clean === "BRKB") return "NYSE:BRK.B";
  if (clean === "BRK-A" || clean === "BRK.A" || clean === "BRKA") return "NYSE:BRK.A";
  if (clean === "PLTR") return "NASDAQ:PLTR";
  if (clean === "COIN") return "NASDAQ:COIN";
  if (clean === "ARM") return "NASDAQ:ARM";
  if (clean === "SMCI") return "NASDAQ:SMCI";
  if (clean === "MSTR") return "NASDAQ:MSTR";
  if (clean === "RKLB") return "NASDAQ:RKLB";
  if (clean === "HOOD") return "NASDAQ:HOOD";
  if (clean === "UBER") return "NYSE:UBER";
  if (clean === "TSM") return "NYSE:TSM";
  if (clean === "BABA") return "NYSE:BABA";

  const us = findUsStockAsset(clean);
  if (us) {
    return `${us.exchange}:${us.code}`;
  }

  // 9. BIST Stocks Check
  const bist = findBistCompany(clean);
  if (bist) {
    return `BIST:${bist.code}`;
  }

  // 10. Fallbacks based on declared type
  if (type === "stock") {
    return `BIST:${clean}`;
  }
  if (type === "us_stock") {
    return clean.replace("-", ".");
  }
  if (type === "forex" && clean.length === 6) {
    return `FX:${clean}`;
  }

  // If looks like standard 4-5 letter BIST stock code (e.g. THYAO, EREGL, FROTO)
  if (/^[A-Z]{4,5}$/.test(clean) && !clean.includes(":") && isBistTicker(clean)) {
    return `BIST:${clean}`;
  }

  return clean;
}

export function toTradingViewInterval(timeframe: string = "1d"): string {
  switch (timeframe) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "10m":
    case "15m":
      return "15";
    case "30m":
      return "30";
    case "1h":
      return "60";
    case "2h":
      return "120";
    case "4h":
      return "240";
    case "1d":
      return "D";
    case "1wk":
      return "W";
    case "1mo":
      return "M";
    default:
      return "D";
  }
}

/**
 * TradingView Teknik Analiz ibresi widget'ı için özel periyot formatı
 * (1m, 5m, 15m, 30m, 1h, 2h, 4h, 1D, 1W, 1M)
 */
export function toTradingViewTechnicalInterval(timeframe: string = "1d"): string {
  switch (timeframe) {
    case "1m":
      return "1m";
    case "5m":
      return "5m";
    case "10m":
    case "15m":
      return "15m";
    case "30m":
      return "30m";
    case "1h":
      return "1h";
    case "2h":
      return "2h";
    case "4h":
      return "4h";
    case "1d":
      return "1D";
    case "1wk":
      return "1W";
    case "1mo":
      return "1M";
    default:
      return "1D";
  }
}

/**
 * Popüler Hızlı Erişim Varlıkları (TradingView Hızlı Seçim Butonları)
 */
export const POPULAR_TV_PRESETS: readonly TradingViewAssetItem[] = [
  // BIST Liderleri
  { symbol: "BIST:THYAO", ticker: "THYAO.IS", code: "THYAO", name: "Türk Hava Yolları", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "✈️" },
  { symbol: "BIST:ASELS", ticker: "ASELS.IS", code: "ASELS", name: "Aselsan", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "🛡️" },
  { symbol: "BIST:GARAN", ticker: "GARAN.IS", code: "GARAN", name: "Garanti BBVA", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "🏦" },
  { symbol: "BIST:EREGL", ticker: "EREGL.IS", code: "EREGL", name: "Ereğli Demir Çelik", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "🏗️" },
  { symbol: "BIST:TUPRS", ticker: "TUPRS.IS", code: "TUPRS", name: "Tüpraş", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "🛢️" },
  { symbol: "BIST:ALTINS1", ticker: "ALTIN.S1", code: "ALTINS1", name: "Darphane Altın Sertifikası (Gram)", category: "bist", categoryLabel: "🇹🇷 BIST", exchange: "BIST", icon: "🪙" },

  // ABD / Wall St Devleri
  { symbol: "NASDAQ:NVDA", ticker: "NVDA", code: "NVDA", name: "NVIDIA Corp.", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "🟢" },
  { symbol: "NASDAQ:AAPL", ticker: "AAPL", code: "AAPL", name: "Apple Inc.", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "🍎" },
  { symbol: "NASDAQ:MSFT", ticker: "MSFT", code: "MSFT", name: "Microsoft Corp.", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "🪟" },
  { symbol: "NASDAQ:TSLA", ticker: "TSLA", code: "TSLA", name: "Tesla Inc.", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "⚡" },
  { symbol: "NASDAQ:PLTR", ticker: "PLTR", code: "PLTR", name: "Palantir Tech", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "🎯" },
  { symbol: "NASDAQ:AMZN", ticker: "AMZN", code: "AMZN", name: "Amazon.com", category: "us_stock", categoryLabel: "🇺🇸 ABD", exchange: "NASDAQ", icon: "📦" },

  // Kripto Paralar
  { symbol: "BINANCE:BTCUSDT", ticker: "BTC-USD", code: "BTC", name: "Bitcoin / USDT", category: "crypto", categoryLabel: "🪙 Kripto", exchange: "BINANCE", icon: "₿" },
  { symbol: "BINANCE:ETHUSDT", ticker: "ETH-USD", code: "ETH", name: "Ethereum / USDT", category: "crypto", categoryLabel: "🪙 Kripto", exchange: "BINANCE", icon: "Ξ" },
  { symbol: "BINANCE:SOLUSDT", ticker: "SOL-USD", code: "SOL", name: "Solana / USDT", category: "crypto", categoryLabel: "🪙 Kripto", exchange: "BINANCE", icon: "◎" },
  { symbol: "BINANCE:AVAXUSDT", ticker: "AVAX-USD", code: "AVAX", name: "Avalanche / USDT", category: "crypto", categoryLabel: "🪙 Kripto", exchange: "BINANCE", icon: "🔺" },

  // Emtia & Döviz
  { symbol: "OANDA:XAUUSD", ticker: "GC=F", code: "GC=F", name: "Ons Altın (USD)", category: "commodity", categoryLabel: "🥇 Emtia", exchange: "OANDA", icon: "🥇" },
  { symbol: "OANDA:XAGUSD", ticker: "SI=F", code: "SI=F", name: "Gümüş (USD)", category: "commodity", categoryLabel: "🥇 Emtia", exchange: "OANDA", icon: "🥈" },
  { symbol: "TVC:UKOIL", ticker: "BZ=F", code: "BZ=F", name: "Brent Petrol", category: "commodity", categoryLabel: "🥇 Emtia", exchange: "TVC", icon: "🛢️" },
  { symbol: "FX:USDTRY", ticker: "USDTRY=X", code: "USDTRY", name: "Amerikan Doları / TL", category: "forex", categoryLabel: "💵 Döviz", exchange: "FX", icon: "💵" },
  { symbol: "FX:EURTRY", ticker: "EURTRY=X", code: "EURTRY", name: "Euro / TL", category: "forex", categoryLabel: "💵 Döviz", exchange: "FX", icon: "💶" },
  { symbol: "FX:EURUSD", ticker: "EURUSD=X", code: "EURUSD", name: "EUR / USD", category: "forex", categoryLabel: "💵 Döviz", exchange: "FX", icon: "🇪🇺" },

  // Endeksler
  { symbol: "BIST:XU100", ticker: "XU100.IS", code: "XU100", name: "BIST 100 Endeksi", category: "index", categoryLabel: "📈 Endeks", exchange: "BIST", icon: "🇹🇷" },
  { symbol: "S&P:SPX", ticker: "^GSPC", code: "SPX", name: "S&P 500 Endeksi", category: "index", categoryLabel: "📈 Endeks", exchange: "S&P", icon: "🇺🇸" },
  { symbol: "NASDAQ:IXIC", ticker: "^IXIC", code: "IXIC", name: "Nasdaq Bileşik Endeksi", category: "index", categoryLabel: "📈 Endeks", exchange: "NASDAQ", icon: "📊" },
  { symbol: "TVC:DXY", ticker: "DX-Y.NYB", code: "DXY", name: "ABD Dolar Endeksi", category: "index", categoryLabel: "📈 Endeks", exchange: "TVC", icon: "🌐" },
  { symbol: "CBOE:VIX", ticker: "^VIX", code: "VIX", name: "VIX Volatilite (Korku)", category: "index", categoryLabel: "📈 Endeks", exchange: "CBOE", icon: "⚡" },
] as const;

/**
 * Tüm piyasalarda (BIST, ABD, Kripto, Emtia, FX, Endeksler) arama motoru
 */
export function searchAllTradingViewAssets(
  query: string,
  categoryFilter?: "all" | "bist" | "us_stock" | "crypto" | "commodity" | "forex" | "index",
  limit = 25
): TradingViewAssetItem[] {
  const q = normalizeTurkish(query || "");

  // If query is empty, return popular presets filtered by category
  if (!q) {
    if (!categoryFilter || categoryFilter === "all") {
      return [...POPULAR_TV_PRESETS].slice(0, limit);
    }
    return POPULAR_TV_PRESETS.filter((p) => p.category === categoryFilter).slice(0, limit);
  }

  const results: TradingViewAssetItem[] = [];
  const seenSymbols = new Set<string>();

  const add = (item: TradingViewAssetItem) => {
    if (!seenSymbols.has(item.symbol)) {
      seenSymbols.add(item.symbol);
      results.push(item);
    }
  };

  // 1. Check popular presets first for instant exact match
  for (const preset of POPULAR_TV_PRESETS) {
    if (categoryFilter && categoryFilter !== "all" && preset.category !== categoryFilter) continue;
    const codeNorm = normalizeTurkish(preset.code);
    const nameNorm = normalizeTurkish(preset.name);
    if (codeNorm === q || nameNorm.startsWith(q)) {
      add(preset);
    }
  }

  // 2. Check BIST Companies
  if (!categoryFilter || categoryFilter === "all" || categoryFilter === "bist") {
    for (const c of BIST_COMPANIES) {
      if (results.length >= limit * 2) break;
      const codeNorm = normalizeTurkish(c.code);
      const nameNorm = normalizeTurkish(c.name);
      if (codeNorm.startsWith(q) || nameNorm.includes(q)) {
        add({
          symbol: `BIST:${c.code}`,
          ticker: c.ticker,
          code: c.code,
          name: c.name,
          category: "bist",
          categoryLabel: "🇹🇷 BIST",
          exchange: "BIST",
          icon: "🇹🇷",
        });
      }
    }
  }

  // 3. Check US Stock Assets
  if (!categoryFilter || categoryFilter === "all" || categoryFilter === "us_stock") {
    for (const s of US_STOCK_ASSETS) {
      if (results.length >= limit * 2) break;
      const codeNorm = normalizeTurkish(s.code);
      const nameNorm = normalizeTurkish(s.name);
      if (codeNorm.startsWith(q) || nameNorm.includes(q)) {
        add({
          symbol: `${s.exchange}:${s.code}`,
          ticker: s.ticker,
          code: s.code,
          name: s.name,
          category: "us_stock",
          categoryLabel: "🇺🇸 ABD",
          exchange: s.exchange,
          icon: s.icon || "🇺🇸",
        });
      }
    }
  }

  // 4. Check Crypto Assets
  if (!categoryFilter || categoryFilter === "all" || categoryFilter === "crypto") {
    for (const c of CRYPTO_ASSETS) {
      if (results.length >= limit * 2) break;
      const codeNorm = normalizeTurkish(c.code);
      const nameNorm = normalizeTurkish(c.name);
      if (codeNorm.startsWith(q) || nameNorm.includes(q)) {
        add({
          symbol: `BINANCE:${c.code}USDT`,
          ticker: c.ticker,
          code: c.code,
          name: `${c.name} (${c.code}/USDT)`,
          category: "crypto",
          categoryLabel: "🪙 Kripto",
          exchange: "BINANCE",
          icon: c.icon || "🪙",
        });
      }
    }
  }

  // 5. Check Curated Market Items (Commodities, Forex, Indices)
  for (const [t, item] of Object.entries(CURATED_MARKET_ITEMS)) {
    if (results.length >= limit * 2) break;
    const cat = item.category as "commodity" | "forex";
    if (categoryFilter && categoryFilter !== "all" && categoryFilter !== cat) continue;
    const codeNorm = normalizeTurkish(t);
    const nameNorm = normalizeTurkish(item.name);
    if (codeNorm.startsWith(q) || nameNorm.includes(q)) {
      const tvSym = toTradingViewSymbol(t, cat);
      add({
        symbol: tvSym,
        ticker: t,
        code: t.replace("=X", "").replace("=F", ""),
        name: item.name,
        category: cat,
        categoryLabel: cat === "commodity" ? "🥇 Emtia" : "💵 Döviz",
        exchange: tvSym.split(":")[0] || "MARKET",
        icon: item.icon || (cat === "commodity" ? "🥇" : "💵"),
      });
    }
  }

  // If user typed a custom query and there are fewer matches, offer the direct custom symbol
  if (results.length === 0 && query.trim()) {
    const customClean = query.trim().toUpperCase();
    const resolvedSymbol = toTradingViewSymbol(customClean);
    results.push({
      symbol: resolvedSymbol,
      ticker: customClean,
      code: customClean,
      name: `Özel Sembol: ${resolvedSymbol}`,
      category: "bist",
      categoryLabel: "⚡ Özel Varlık",
      exchange: resolvedSymbol.split(":")[0] || "TV",
      icon: "⚡",
    });
  }

  return results.slice(0, limit);
}

/**
 * TradingView symbol resolver and utilities.
 * Maps local / Yahoo Finance tickers to official TradingView symbol formats.
 */

import { findUsStockAsset } from "./us-stock-assets";
import { findBistCompany } from "./bist";

export function toTradingViewSymbol(ticker: string, type?: string): string {
  const clean = (ticker || "").trim().toUpperCase();

  // BIST Stocks: THYAO.IS -> BIST:THYAO
  if (clean.endsWith(".IS")) {
    return `BIST:${clean.replace(/\.IS$/, "")}`;
  }

  // Currencies / Forex
  if (clean === "USDTRY=X" || clean === "USDTRY") return "FX:USDTRY";
  if (clean === "EURTRY=X" || clean === "EURTRY") return "FX:EURTRY";
  if (clean === "EURUSD=X" || clean === "EURUSD") return "FX:EURUSD";
  if (clean === "GBPTRY=X" || clean === "GBPTRY") return "FX:GBPTRY";

  // Commodities
  if (clean === "GC=F" || clean === "XAUUSD") return "OANDA:XAUUSD";
  if (clean === "SI=F" || clean === "XAGUSD") return "OANDA:XAGUSD";
  if (clean === "CL=F" || clean === "USOIL") return "TVC:USOIL";
  if (clean === "BZ=F" || clean === "UKOIL") return "TVC:UKOIL";

  // Macro / Indices
  if (clean === "^TNX") return "TVC:US10Y";
  if (clean === "DX-Y.NYB" || clean === "DXY") return "TVC:DXY";
  if (clean === "^GSPC" || clean === "SPX") return "S&P:SPX";
  if (clean === "^IXIC" || clean === "IXIC") return "NASDAQ:IXIC";
  if (clean === "XU100.IS") return "BIST:XU100";
  if (clean === "XU030.IS") return "BIST:XU030";

  // All Crypto (e.g. BTC-USD -> BINANCE:BTCUSDT, AVAX-USD -> BINANCE:AVAXUSDT)
  if (clean.endsWith("-USD")) {
    const coin = clean.replace(/-USD$/, "");
    return `BINANCE:${coin}USDT`;
  }
  if (clean.endsWith("-USDT")) {
    const coin = clean.replace(/-USDT$/, "");
    return `BINANCE:${coin}USDT`;
  }
  if (clean === "BTCUSD") return "BINANCE:BTCUSDT";
  if (clean === "ETHUSD") return "BINANCE:ETHUSDT";
  if (clean === "SOLUSD") return "BINANCE:SOLUSDT";

  // If already prefixed with exchange (e.g. BIST:THYAO, NASDAQ:AAPL)
  if (clean.includes(":")) return clean;

  // US Stocks: map to exact exchange (e.g. NASDAQ:AAPL, NYSE:JPM)
  const us = findUsStockAsset(clean);
  if (us) {
    return `${us.exchange}:${us.code}`;
  }

  // BIST check
  if (findBistCompany(clean) || type === "stock") {
    return `BIST:${clean}`;
  }

  return clean;
}

export function toTradingViewInterval(timeframe: string = "1d"): string {
  switch (timeframe) {
    case "5m":
      return "5";
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

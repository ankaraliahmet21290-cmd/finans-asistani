/**
 * TradingView symbol resolver and utilities.
 * Maps local / Yahoo Finance tickers to official TradingView symbol formats.
 */

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

  // Crypto
  if (clean === "BTC-USD" || clean === "BTCUSD") return "BINANCE:BTCUSDT";
  if (clean === "ETH-USD" || clean === "ETHUSD") return "BINANCE:ETHUSDT";
  if (clean === "SOL-USD" || clean === "SOLUSD") return "BINANCE:SOLUSDT";

  // If already prefixed with exchange (e.g. BIST:THYAO, NASDAQ:AAPL)
  if (clean.includes(":")) return clean;

  // Stock fallback: If type is stock and no dot, check if it's likely BIST or US
  if (type === "stock") {
    // If 4-5 chars without dot, treat as BIST
    if (/^[A-Z]{3,5}$/.test(clean)) {
      return `BIST:${clean}`;
    }
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

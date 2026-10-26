import YahooFinance from "yahoo-finance2";
import type {
  Candle,
  CryptoFundamentals,
  ForexCommodityMetrics,
  Fundamentals,
  MacroPoint,
  PivotPoints,
  TimeframeKey,
  UsStockFundamentals,
} from "./types";
import { getActiveRefreshConfig } from "./refresh-settings-storage";
import { US_STOCK_ALIASES } from "./us-stock-assets";

export function resolveTickerSymbol(ticker: string): string {
  if (!ticker) return ticker;
  const upper = ticker.toUpperCase().trim();
  return US_STOCK_ALIASES[upper] || ticker;
}

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  versionCheck: false,
  queue: {
    concurrency: 8,
    interval: 20,
  },
});

const cache = new Map<string, { at: number; value: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, fn: () => Promise<T>, customTtl?: number): Promise<T> {
  const ttl = customTtl ?? getActiveRefreshConfig().cacheTtlMs;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;

  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await fn();
      cache.set(key, { at: Date.now(), value });
      return value;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

export function clearDataCache(): void {
  cache.clear();
  inFlightRequests.clear();
}

/**
 * Yahoo Finance geçici 429 (Too Many Requests) veya network hatalarında exponential backoff ile tekrar dener.
 */
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("delisted") || msg.includes("No data found")) {
        throw err;
      }
      const isRateLimit = msg.includes("Too Many Requests") || msg.includes("429");
      if (attempt < retries) {
        const delay = isRateLimit
          ? initialDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500)
          : 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export interface CandleResult {
  ticker: string;
  name: string;
  currency: string;
  timeframe: TimeframeKey;
  regularMarketPrice?: number | null;
  previousClose?: number | null;
  candles: Candle[];
  closes: number[];
}

function aggregateCandlesByMinutes(candles: Candle[], intervalMinutes: number): Candle[] {
  if (candles.length === 0) return [];
  const bucketMs = intervalMinutes * 60 * 1000;
  const groups = new Map<number, Candle[]>();

  for (const c of candles) {
    const t = new Date(c.date).getTime();
    if (isNaN(t)) continue;
    // Saat/dakika sınırına (09:00, 09:15, 09:30 vb.) tam hizalama
    const key = Math.floor(t / bucketMs) * bucketMs;
    const arr = groups.get(key);
    if (arr) {
      arr.push(c);
    } else {
      groups.set(key, [c]);
    }
  }

  const result: Candle[] = [];
  for (const chunk of groups.values()) {
    if (chunk.length === 0) continue;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const c of chunk) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      if (c.volume != null) volume += c.volume;
    }
    result.push({
      date: chunk[0].date,
      open: chunk[0].open,
      high,
      low,
      close: chunk[chunk.length - 1].close,
      volume,
    });
  }

  return result;
}

function aggregateCandlesByPeriod(candles: Candle[], period: "week" | "month"): Candle[] {
  const groups: Candle[][] = [];
  let currentGroup: Candle[] = [];
  let currentKey = "";

  for (const c of candles) {
    const d = new Date(c.date);
    let key = "";
    if (period === "week") {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    }

    if (key !== currentKey) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [c];
      currentKey = key;
    } else {
      currentGroup.push(c);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.map((chunk) => {
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const c of chunk) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      if (c.volume != null) volume += c.volume;
    }
    return {
      date: chunk[0].date,
      open: chunk[0].open,
      high,
      low,
      close: chunk[chunk.length - 1].close,
      volume,
    };
  });
}

interface RawChartData {
  meta: {
    longName?: string;
    shortName?: string;
    currency?: string;
    regularMarketPrice?: number | null;
    previousClose?: number | null;
    chartPreviousClose?: number | null;
  };
  candles: Candle[];
}

/**
 * Temel Yahoo chart çağrısı.
 * 10 ayrı timeframe yerine yalnızca 3 temel timeframe ("5m", "1h", "1d") üzerinden veri çeker.
 * Böylece Yahoo istek sayısı %70 oranında azalır ve rate-limit engellenir.
 */
async function fetchBaseChart(ticker: string, base: "5m" | "1h" | "1d"): Promise<RawChartData> {
  const actualTicker = resolveTickerSymbol(ticker);
  const chartTtl = base === "1d" ? 120_000 : base === "1h" ? 60_000 : 30_000;
  return cached(
    `base_chart:${actualTicker}:${base}`,
    async () => {
      // 5m: 30 gün (yeterli bar derinliği), 1h: 180 gün (SMA200 için >200 bar), 1d: 1500 gün (haftalık SMA200 için >200 hafta)
      const days = base === "5m" ? 30 : base === "1h" ? 180 : 1500;
      const period1 = new Date(Date.now() - days * 24 * 3600 * 1000);

      const res = await fetchWithRetry(() => yf.chart(actualTicker, { period1, interval: base }));

      const rawCandles: Candle[] = [];
      const quotes = res.quotes;
      for (let i = 0; i < quotes.length; i++) {
        const q = quotes[i];
        let close = q.close;
        if (close == null && i === quotes.length - 1 && res.meta.regularMarketPrice != null) {
          close = res.meta.regularMarketPrice;
        }
        if (close == null || q.open == null || q.high == null || q.low == null) continue;
        rawCandles.push({
          date: q.date.toISOString(),
          open: q.open,
          high: Math.max(q.high, close),
          low: Math.min(q.low, close),
          close,
          volume: q.volume ?? 0,
        });
      }

      if (rawCandles.length === 0) {
        throw new Error(`${ticker} için ${base} periyodunda fiyat verisi boş`);
      }

      return {
        meta: {
          longName: res.meta.longName,
          shortName: res.meta.shortName,
          currency: res.meta.currency,
          regularMarketPrice: res.meta.regularMarketPrice ?? null,
          previousClose: res.meta.previousClose ?? res.meta.chartPreviousClose ?? null,
        },
        candles: rawCandles,
      };
    },
    chartTtl
  );
}

/**
 * Doğrudan Yahoo'nun orijinal interval uç noktasından veri çeker.
 * (15m, 30m, 1wk, 1mo, 1d, 1h, 5m)
 */
async function fetchDirectChart(
  ticker: string,
  interval: "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo",
  days: number
): Promise<RawChartData> {
  const actualTicker = resolveTickerSymbol(ticker);
  return cached(`direct_chart:${actualTicker}:${interval}:${days}`, async () => {
    const period1 = new Date(Date.now() - days * 24 * 3600 * 1000);
    const res = await fetchWithRetry(() => yf.chart(actualTicker, { period1, interval }));

    const rawCandles: Candle[] = [];
    const quotes = res.quotes;
    for (let i = 0; i < quotes.length; i++) {
      const q = quotes[i];
      let close = q.close;
      if (close == null && i === quotes.length - 1 && res.meta.regularMarketPrice != null) {
        close = res.meta.regularMarketPrice;
      }
      if (close == null || q.open == null || q.high == null || q.low == null) continue;
      rawCandles.push({
        date: q.date.toISOString(),
        open: q.open,
        high: Math.max(q.high, close),
        low: Math.min(q.low, close),
        close,
        volume: q.volume ?? 0,
      });
    }

    if (rawCandles.length === 0) {
      throw new Error(`${ticker} için ${interval} periyodunda fiyat verisi boş`);
    }

    return {
      meta: {
        longName: res.meta.longName,
        shortName: res.meta.shortName,
        currency: res.meta.currency,
        regularMarketPrice: res.meta.regularMarketPrice ?? null,
        previousClose: res.meta.previousClose ?? res.meta.chartPreviousClose ?? null,
      },
      candles: rawCandles,
    };
  });
}

export interface GetCandlesOptions {
  /**
   * true ise (varsayılan), Yahoo'nun doğrudan desteklediği (15m, 30m, 1wk, 1mo, 1d, 1h, 5m)
   * periyotlar doğrudan orijinal Yahoo uç noktalarından çekilir.
   * false ise (BIST 100 / BIST TÜM toplu taramada), 3 temel veriden (5m, 1h, 1d) türetilerek
   * rate-limit engellenir ve tarama 3 kat hızlandırılır.
   */
  preferDirect?: boolean;
}

export async function getCandles(
  ticker: string,
  tf: TimeframeKey = "1d",
  options?: GetCandlesOptions
): Promise<CandleResult> {
  const actualTicker = resolveTickerSymbol(ticker);
  const preferDirect = options?.preferDirect ?? true;

  return cached(`candles:${actualTicker}:${tf}:${preferDirect ? "direct" : "derived"}`, async () => {
    // 1. Orijinal Yahoo uç noktalarından doğrudan çekme modu (Tekil analizler ve BIST 30)
    if (preferDirect) {
      if (tf === "15m") {
        const raw = await fetchDirectChart(actualTicker, "15m", 30);
        return {
          ticker: actualTicker,
          name: raw.meta.longName || raw.meta.shortName || actualTicker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "30m") {
        const raw = await fetchDirectChart(ticker, "30m", 60);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "1wk") {
        const raw = await fetchDirectChart(ticker, "1wk", 730);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "1mo") {
        const raw = await fetchDirectChart(ticker, "1mo", 1460);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "5m") {
        const raw = await fetchDirectChart(ticker, "5m", 14);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "1h") {
        const raw = await fetchDirectChart(ticker, "1h", 90);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      if (tf === "1d") {
        const raw = await fetchDirectChart(ticker, "1d", 400);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: raw.candles,
          closes: raw.candles.map((c) => c.close),
        };
      }
      // Yahoo'nun doğrudan sağlamadığı 10m, 2h, 4h periyotları için en yakın temel periyottan aggregate et
      if (tf === "10m") {
        const raw = await fetchDirectChart(ticker, "5m", 30);
        const aggregated = aggregateCandlesByMinutes(raw.candles, 10);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: aggregated,
          closes: aggregated.map((c) => c.close),
        };
      }
      if (tf === "2h") {
        const raw = await fetchDirectChart(ticker, "1h", 120);
        const aggregated = aggregateCandlesByMinutes(raw.candles, 120);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: aggregated,
          closes: aggregated.map((c) => c.close),
        };
      }
      if (tf === "4h") {
        const raw = await fetchDirectChart(ticker, "1h", 180);
        const aggregated = aggregateCandlesByMinutes(raw.candles, 240);
        return {
          ticker,
          name: raw.meta.longName || raw.meta.shortName || ticker,
          currency: raw.meta.currency || "TRY",
          timeframe: tf,
          regularMarketPrice: raw.meta.regularMarketPrice ?? null,
          previousClose: raw.meta.previousClose ?? null,
          candles: aggregated,
          closes: aggregated.map((c) => c.close),
        };
      }
    }

    // 2. Türetilmiş mod (BIST 30 / BIST 100 / BIST TÜM toplu tarama: rate-limit korumalı ve yüksek hızlı)
    let base: "5m" | "1h" | "1d" = "1d";
    if (tf === "5m" || tf === "10m" || tf === "15m" || tf === "30m") {
      base = "5m";
    } else if (tf === "1h" || tf === "2h" || tf === "4h") {
      base = "1h";
    } else {
      base = "1d";
    }

    const baseData = await fetchBaseChart(ticker, base);
    const rawCandles = baseData.candles;

    let candles = rawCandles;
    if (tf === "10m") {
      candles = aggregateCandlesByMinutes(rawCandles, 10);
    } else if (tf === "15m") {
      candles = aggregateCandlesByMinutes(rawCandles, 15);
    } else if (tf === "30m") {
      candles = aggregateCandlesByMinutes(rawCandles, 30);
    } else if (tf === "2h") {
      candles = aggregateCandlesByMinutes(rawCandles, 120);
    } else if (tf === "4h") {
      candles = aggregateCandlesByMinutes(rawCandles, 240);
    } else if (tf === "1wk") {
      candles = aggregateCandlesByPeriod(rawCandles, "week");
    } else if (tf === "1mo") {
      candles = aggregateCandlesByPeriod(rawCandles, "month");
    }

    return {
      ticker,
      name: baseData.meta.longName || baseData.meta.shortName || ticker,
      currency: baseData.meta.currency || "TRY",
      timeframe: tf,
      regularMarketPrice: baseData.meta.regularMarketPrice ?? null,
      previousClose: baseData.meta.previousClose ?? null,
      candles,
      closes: candles.map((c) => c.close),
    };
  });
}

const FUNDAMENTALS_TTL_MS = 60 * 60 * 1000; // 1 saat önbellek (bilançolar dakikada bir değişmez)

export async function getRawQuoteSummary(ticker: string) {
  const actualTicker = resolveTickerSymbol(ticker);
  return cached(
    `raw_quote_summary:${actualTicker}`,
    async () => {
      return await fetchWithRetry(() =>
        yf.quoteSummary(actualTicker, {
          modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
        })
      );
    },
    FUNDAMENTALS_TTL_MS
  );
}

export async function getFundamentals(ticker: string): Promise<Fundamentals> {
  const actualTicker = resolveTickerSymbol(ticker);
  return cached(
    `fundamentals:${actualTicker}`,
    async () => {
      const s = await getRawQuoteSummary(actualTicker);

      const pe =
        (s.summaryDetail?.trailingPE as number | undefined) ??
        (s.summaryDetail?.forwardPE as number | undefined) ??
        null;

      const pb = (s.defaultKeyStatistics?.priceToBook as number | undefined) ?? null;
      const peg = (s.defaultKeyStatistics?.pegRatio as number | undefined) ?? null;
      const roe = (s.financialData?.returnOnEquity as number | undefined) ?? null;
      const roa = (s.financialData?.returnOnAssets as number | undefined) ?? null;
      const profitMargins = (s.financialData?.profitMargins as number | undefined) ?? null;
      const operatingMargins = (s.financialData?.operatingMargins as number | undefined) ?? null;
      const debtToEquity = (s.financialData?.debtToEquity as number | undefined) ?? null;
      const currentRatio = (s.financialData?.currentRatio as number | undefined) ?? null;
      const revenueGrowth = (s.financialData?.revenueGrowth as number | undefined) ?? null;
      const dividendYield = (s.summaryDetail?.dividendYield as number | undefined) ?? null;

      return {
        pe,
        pb,
        peg,
        roe,
        roa,
        profitMargins,
        operatingMargins,
        debtToEquity,
        currentRatio,
        revenueGrowth,
        dividendYield,
      };
    },
    FUNDAMENTALS_TTL_MS
  );
}

const MACRO_SYMBOLS: { ticker: string; label: string }[] = [
  { ticker: "DX-Y.NYB", label: "Dolar Endeksi (DXY)" },
  { ticker: "^TNX", label: "ABD 10Y Faiz" },
  { ticker: "USDTRY=X", label: "USD/TRY" },
];

export async function getMacro(): Promise<MacroPoint[]> {
  return cached("macro", async () => {
    try {
      const quotes = await yf.quote(MACRO_SYMBOLS.map((m) => m.ticker));
      return MACRO_SYMBOLS.map((m, i) => ({
        ticker: m.ticker,
        label: m.label,
        value: quotes[i]?.regularMarketPrice ?? null,
        changePercent: quotes[i]?.regularMarketChangePercent ?? null,
      }));
    } catch {
      return MACRO_SYMBOLS.map((m) => ({
        ticker: m.ticker,
        label: m.label,
        value: null,
        changePercent: null,
      }));
    }
  });
}

const OUNCE_TO_GRAM = 31.1035;

export async function getUsdTry(): Promise<number | null> {
  const macro = await getMacro();
  return macro.find((m) => m.ticker === "USDTRY=X")?.value ?? null;
}

export async function gramGoldTRY(xauUsd: number): Promise<number | null> {
  const usdTry = await getUsdTry();
  if (usdTry == null) return null;
  return (xauUsd * usdTry) / OUNCE_TO_GRAM;
}

/**
 * Klasik ve Fibonacci Pivot Seviyeleri (Forex ve Emtialar için temel destek/direnç motoru)
 */
export function calculatePivotPoints(high: number, low: number, close: number): PivotPoints {
  const p = (high + low + close) / 3;
  const range = high - low;

  // Klasik Pivotlar
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + range;
  const s2 = p - range;
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);

  // Fibonacci Pivotlar
  const fibR1 = p + 0.382 * range;
  const fibS1 = p - 0.382 * range;
  const fibR2 = p + 0.618 * range;
  const fibS2 = p - 0.618 * range;
  const fibR3 = p + 1.0 * range;
  const fibS3 = p - 1.0 * range;

  return {
    pivot: Number(p.toFixed(4)),
    r1: Number(r1.toFixed(4)),
    r2: Number(r2.toFixed(4)),
    r3: Number(r3.toFixed(4)),
    s1: Number(s1.toFixed(4)),
    s2: Number(s2.toFixed(4)),
    s3: Number(s3.toFixed(4)),
    fibR1: Number(fibR1.toFixed(4)),
    fibR2: Number(fibR2.toFixed(4)),
    fibR3: Number(fibR3.toFixed(4)),
    fibS1: Number(fibS1.toFixed(4)),
    fibS2: Number(fibS2.toFixed(4)),
    fibS3: Number(fibS3.toFixed(4)),
  };
}

/**
 * Emtia ve Döviz için Özel Makroekonomik ve Teknik Metrikler
 */
export async function getForexCommodityMetrics(
  ticker: string,
  candles: Candle[]
): Promise<ForexCommodityMetrics> {
  return cached(`forex_metrics:${ticker}`, async () => {
    try {
      const quotes = await yf.quote(["DX-Y.NYB", "^TNX", "GC=F", "SI=F", "USDTRY=X"]);
      const dxy = quotes.find((q) => q.symbol === "DX-Y.NYB");
      const us10y = quotes.find((q) => q.symbol === "^TNX");
      const gold = quotes.find((q) => q.symbol === "GC=F");
      const silver = quotes.find((q) => q.symbol === "SI=F");
      const usdTry = quotes.find((q) => q.symbol === "USDTRY=X");

      // Pivot seviyeleri için son tamamlanmış gün/mum değerleri
      let pivotPoints: PivotPoints | undefined;
      let atr: number | null = null;

      if (candles.length >= 2) {
        const prevCandle = candles[candles.length - 2];
        pivotPoints = calculatePivotPoints(prevCandle.high, prevCandle.low, prevCandle.close);

        // Basit ATR (14 periyot)
        const recentCandles = candles.slice(-15);
        if (recentCandles.length >= 2) {
          let sumTr = 0;
          for (let i = 1; i < recentCandles.length; i++) {
            const h = recentCandles[i].high;
            const l = recentCandles[i].low;
            const pc = recentCandles[i - 1].close;
            const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            sumTr += tr;
          }
          atr = Number((sumTr / (recentCandles.length - 1)).toFixed(4));
        }
      }

      const goldPrice = gold?.regularMarketPrice ?? null;
      const silverPrice = silver?.regularMarketPrice ?? null;
      const goldSilverRatio =
        goldPrice && silverPrice && silverPrice > 0 ? Number((goldPrice / silverPrice).toFixed(2)) : null;

      const gramGold =
        goldPrice && usdTry?.regularMarketPrice
          ? Number(((goldPrice * usdTry.regularMarketPrice) / OUNCE_TO_GRAM).toFixed(2))
          : null;

      const targetQuote = quotes.find((q) => q.symbol === ticker);

      return {
        pivotPoints,
        dxyValue: dxy?.regularMarketPrice ?? null,
        dxyChangePercent: dxy?.regularMarketChangePercent ?? null,
        us10yYield: us10y?.regularMarketPrice ?? null,
        goldSilverRatio,
        gramGoldTRY: gramGold,
        atr,
        fiftyTwoWeekHigh: targetQuote?.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: targetQuote?.fiftyTwoWeekLow ?? null,
      };
    } catch (err) {
      console.warn(`[getForexCommodityMetrics] Error for ${ticker}:`, err);
      return {
        dxyValue: null,
        dxyChangePercent: null,
        us10yYield: null,
        goldSilverRatio: null,
        gramGoldTRY: null,
        atr: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
      };
    }
  }, 60 * 1000); // 1 dk önbellek
}

/**
 * Kripto Paralar için Özel Temel & Ekosistem Göstergeleri
 */
export async function getCryptoFundamentals(ticker: string): Promise<CryptoFundamentals> {
  return cached(`crypto_fund:${ticker}`, async () => {
    try {
      const q = await yf.quote(ticker);
      const marketCap = q.marketCap ?? null;
      const volume24h = q.regularMarketVolume ?? null;
      const volumeToMarketCap =
        marketCap && volume24h && marketCap > 0 ? Number((volume24h / marketCap).toFixed(4)) : null;
      const circulatingSupply = q.circulatingSupply ?? null;
      const fiftyTwoWeekHigh = q.fiftyTwoWeekHigh ?? null;
      const fiftyTwoWeekLow = q.fiftyTwoWeekLow ?? null;
      const price = q.regularMarketPrice ?? 0;

      const athDropPercent =
        fiftyTwoWeekHigh && fiftyTwoWeekHigh > 0
          ? Number((((price - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100).toFixed(2))
          : null;

      return {
        marketCap,
        volume24h,
        volumeToMarketCap,
        circulatingSupply,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        athDropPercent,
      };
    } catch (err) {
      console.warn(`[getCryptoFundamentals] Error for ${ticker}:`, err);
      return {
        marketCap: null,
        volume24h: null,
        volumeToMarketCap: null,
        circulatingSupply: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        athDropPercent: null,
      };
    }
  }, 60 * 1000);
}

/**
 * ABD Borsası için Wall Street Analist Konsensüsü & Temel Metrikler
 */
export async function getUsStockFundamentals(
  ticker: string,
  currentPrice?: number
): Promise<UsStockFundamentals> {
  return cached(
    `us_stock_fund:${ticker}`,
    async () => {
      try {
        const s = await getRawQuoteSummary(ticker);

        const targetMeanPrice = (s.financialData?.targetMeanPrice as number | undefined) ?? null;
      const price = currentPrice ?? (s.financialData?.currentPrice as number | undefined) ?? 0;
      const upsidePercent =
        targetMeanPrice && price > 0
          ? Number((((targetMeanPrice - price) / price) * 100).toFixed(2))
          : null;

      const recommendationKey = (s.financialData?.recommendationKey as string | undefined) ?? null;
      const recommendationMean = (s.financialData?.recommendationMean as number | undefined) ?? null;

      const pe =
        (s.summaryDetail?.trailingPE as number | undefined) ??
        (s.summaryDetail?.forwardPE as number | undefined) ??
        null;
      const forwardPe = (s.summaryDetail?.forwardPE as number | undefined) ?? null;
      const peg = (s.defaultKeyStatistics?.pegRatio as number | undefined) ?? null;
      const pb = (s.defaultKeyStatistics?.priceToBook as number | undefined) ?? null;
      const roe = (s.financialData?.returnOnEquity as number | undefined) ?? null;
      const revenueGrowth = (s.financialData?.revenueGrowth as number | undefined) ?? null;
      const profitMargins = (s.financialData?.profitMargins as number | undefined) ?? null;
      const operatingMargins = (s.financialData?.operatingMargins as number | undefined) ?? null;
      const debtToEquity = (s.financialData?.debtToEquity as number | undefined) ?? null;
      const dividendYield = (s.summaryDetail?.dividendYield as number | undefined) ?? null;

      return {
        targetMeanPrice,
        upsidePercent,
        recommendationKey,
        recommendationMean,
        pe,
        forwardPe,
        peg,
        pb,
        roe,
        revenueGrowth,
        profitMargins,
        operatingMargins,
        debtToEquity,
        dividendYield,
      };
    } catch (err) {
      console.warn(`[getUsStockFundamentals] Error for ${ticker}:`, err);
      return {
        targetMeanPrice: null,
        upsidePercent: null,
        recommendationKey: null,
        recommendationMean: null,
        pe: null,
        forwardPe: null,
        peg: null,
        pb: null,
        roe: null,
        revenueGrowth: null,
        profitMargins: null,
        operatingMargins: null,
        debtToEquity: null,
        dividendYield: null,
      };
    }
  }, FUNDAMENTALS_TTL_MS);
}

/**
 * Toplu Fiyat & Değişim Sorgulama (Dashboard Hızlı Yükleme)
 */
export async function getBatchQuotes(tickers: string[]) {
  return cached(`batch_quotes:${tickers.sort().join(",")}`, async () => {
    try {
      const aliasMap = new Map<string, string>();
      const resolvedTickers = Array.from(
        new Set(
          tickers.map((t) => {
            const resolved = resolveTickerSymbol(t);
            if (resolved !== t) {
              aliasMap.set(resolved, t);
            }
            return resolved;
          })
        )
      );

      const quotes = await yf.quote(resolvedTickers);
      const res: Record<string, { price: number; change: number; changePercent: number; name: string }> = {};
      for (const q of quotes) {
        if (!q.symbol) continue;
        const entry = {
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          name: q.shortName || q.longName || q.symbol,
        };
        res[q.symbol] = entry;
        const originalAlias = aliasMap.get(q.symbol);
        if (originalAlias) {
          res[originalAlias] = entry;
        }

        // Kripto varlıklar için fundamentals önbelleğini doğrudan tohumla (ekstra istekleri %100 önler)
        if (q.marketCap != null || q.circulatingSupply != null || q.symbol.includes("-USD") || q.quoteType === "CRYPTOCURRENCY") {
          const marketCap = q.marketCap ?? null;
          const volume24h = q.regularMarketVolume ?? null;
          const volumeToMarketCap =
            marketCap && volume24h && marketCap > 0 ? Number((volume24h / marketCap).toFixed(4)) : null;
          const circulatingSupply = q.circulatingSupply ?? null;
          const fiftyTwoWeekHigh = q.fiftyTwoWeekHigh ?? null;
          const fiftyTwoWeekLow = q.fiftyTwoWeekLow ?? null;
          const price = q.regularMarketPrice ?? 0;
          const athDropPercent =
            fiftyTwoWeekHigh && fiftyTwoWeekHigh > 0
              ? Number((((price - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100).toFixed(2))
              : null;

          cache.set(`crypto_fund:${q.symbol}`, {
            at: Date.now(),
            value: {
              marketCap,
              volume24h,
              volumeToMarketCap,
              circulatingSupply,
              fiftyTwoWeekHigh,
              fiftyTwoWeekLow,
              athDropPercent,
            },
          });
        }
      }
      return res;
    } catch (err) {
      console.error("[getBatchQuotes] Error:", err);
      return {};
    }
  }, 10 * 1000); // 10 saniye önbellek
}

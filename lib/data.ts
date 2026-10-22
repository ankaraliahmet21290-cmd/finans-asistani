import YahooFinance from "yahoo-finance2";
import type { Candle, Fundamentals, MacroPoint, TimeframeKey } from "./types";
import { getActiveRefreshConfig } from "./refresh-settings-storage";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
  versionCheck: false,
  queue: {
    concurrency: 4,
    interval: 100,
  },
});

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>, customTtl?: number): Promise<T> {
  const ttl = customTtl ?? getActiveRefreshConfig().cacheTtlMs;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearDataCache(): void {
  cache.clear();
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

function aggregateCandles(candles: Candle[], groupSize: number): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
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
      open,
      high,
      low,
      close,
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
  return cached(`base_chart:${ticker}:${base}`, async () => {
    const days = base === "5m" ? 14 : base === "1h" ? 60 : 400;
    const period1 = new Date(Date.now() - days * 24 * 3600 * 1000);

    const res = await fetchWithRetry(() => yf.chart(ticker, { period1, interval: base }));

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
  });
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
  return cached(`direct_chart:${ticker}:${interval}:${days}`, async () => {
    const period1 = new Date(Date.now() - days * 24 * 3600 * 1000);
    const res = await fetchWithRetry(() => yf.chart(ticker, { period1, interval }));

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
  const preferDirect = options?.preferDirect ?? true;

  return cached(`candles:${ticker}:${tf}:${preferDirect ? "direct" : "derived"}`, async () => {
    // 1. Orijinal Yahoo uç noktalarından doğrudan çekme modu (Tekil analizler ve BIST 30)
    if (preferDirect) {
      if (tf === "15m") {
        const raw = await fetchDirectChart(ticker, "15m", 30);
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
        const raw = await fetchDirectChart(ticker, "5m", 14);
        const aggregated = aggregateCandles(raw.candles, 2);
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
        const raw = await fetchDirectChart(ticker, "1h", 90);
        const aggregated = aggregateCandles(raw.candles, 2);
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
        const raw = await fetchDirectChart(ticker, "1h", 120);
        const aggregated = aggregateCandles(raw.candles, 4);
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

    // 2. Türetilmiş mod (BIST 100 / BIST TÜM toplu tarama: rate-limit korumalı ve hızlı)
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
      candles = aggregateCandles(rawCandles, 2);
    } else if (tf === "15m") {
      candles = aggregateCandles(rawCandles, 3);
    } else if (tf === "30m") {
      candles = aggregateCandles(rawCandles, 6);
    } else if (tf === "2h") {
      candles = aggregateCandles(rawCandles, 2);
    } else if (tf === "4h") {
      candles = aggregateCandles(rawCandles, 4);
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

export async function getFundamentals(ticker: string): Promise<Fundamentals> {
  return cached(
    `fundamentals:${ticker}`,
    async () => {
      const s = await fetchWithRetry(() =>
        yf.quoteSummary(ticker, {
          modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
        })
      );

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

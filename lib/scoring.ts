import type {
  FundamentalMetric,
  FundamentalResult,
  Fundamentals,
  Indicators,
  ScoreItem,
  Signal,
  TechnicalResult,
} from "./types";

const last = <T>(arr: readonly T[] | undefined, n = 1): T | undefined =>
  arr && arr.length >= n ? arr[arr.length - n] : undefined;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function technicalScore(closes: number[], ind: Indicators): TechnicalResult {
  const items: ScoreItem[] = [];
  let sum = 0;
  let evaluated = 0;

  const rsi = last(ind.rsi);
  if (rsi != null) {
    evaluated++;
    if (rsi < 30) {
      sum++;
      items.push({ name: "RSI(14)", point: 1, detail: `RSI ${rsi.toFixed(1)} < 30 → aşırı satım` });
    } else if (rsi > 70) {
      sum--;
      items.push({ name: "RSI(14)", point: -1, detail: `RSI ${rsi.toFixed(1)} > 70 → aşırı alım` });
    } else {
      items.push({ name: "RSI(14)", point: 0, detail: `RSI ${rsi.toFixed(1)} → nötr bölge` });
    }
  }

  const m = last(ind.macd);
  const mp = last(ind.macd, 2);
  if (m?.MACD != null && m.signal != null && mp?.MACD != null && mp.signal != null) {
    evaluated++;
    if (mp.MACD <= mp.signal && m.MACD > m.signal) {
      sum++;
      items.push({ name: "MACD(12,26,9)", point: 1, detail: "MACD sinyalini yukarı kesti" });
    } else if (mp.MACD >= mp.signal && m.MACD < m.signal) {
      sum--;
      items.push({ name: "MACD(12,26,9)", point: -1, detail: "MACD sinyalini aşağı kesti" });
    } else {
      items.push({
        name: "MACD(12,26,9)",
        point: 0,
        detail: m.MACD > m.signal ? "MACD sinyalin üstünde (kesişim yok)" : "MACD sinyalin altında (kesişim yok)",
      });
    }
  }

  const sma50 = last(ind.sma50);
  const sma50Prev = last(ind.sma50, 2);
  const sma200 = last(ind.sma200);
  const sma200Prev = last(ind.sma200, 2);
  if (sma50 != null && sma200 != null) {
    evaluated++;
    if (sma50Prev != null && sma200Prev != null && sma50Prev <= sma200Prev && sma50 > sma200) {
      sum++;
      items.push({ name: "SMA50 / SMA200", point: 1, detail: "Golden cross: SMA50, SMA200'i yukarı kesti" });
    } else if (sma50Prev != null && sma200Prev != null && sma50Prev >= sma200Prev && sma50 < sma200) {
      sum--;
      items.push({ name: "SMA50 / SMA200", point: -1, detail: "Death cross: SMA50, SMA200'ü aşağı kesti" });
    } else if (sma50 > sma200) {
      sum += 0.5;
      items.push({ name: "SMA50 / SMA200", point: 0.5, detail: "SMA50 > SMA200 → yükseliş trendi" });
    } else {
      sum -= 0.5;
      items.push({ name: "SMA50 / SMA200", point: -0.5, detail: "SMA50 < SMA200 → düşüş trendi" });
    }
  }

  const price = last(closes);
  const pricePrev = last(closes, 2);
  const bb = last(ind.bb);
  const bbPrev = last(ind.bb, 2);
  if (price != null && bb) {
    evaluated++;
    if (price < bb.lower) {
      sum++;
      items.push({ name: "Bollinger(20,2)", point: 1, detail: "Fiyat alt bandın altında" });
    } else if (price > bb.upper) {
      sum--;
      items.push({ name: "Bollinger(20,2)", point: -1, detail: "Fiyat üst bandın üstünde" });
    } else if (
      pricePrev != null &&
      bbPrev &&
      pricePrev < bbPrev.lower &&
      price >= bb.lower
    ) {
      sum++;
      items.push({ name: "Bollinger(20,2)", point: 1, detail: "Fiyat alt banttan yukarı döndü" });
    } else if (
      pricePrev != null &&
      bbPrev &&
      pricePrev > bbPrev.upper &&
      price <= bb.upper
    ) {
      sum--;
      items.push({ name: "Bollinger(20,2)", point: -1, detail: "Fiyat üst banttan aşağı döndü" });
    } else {
      items.push({ name: "Bollinger(20,2)", point: 0, detail: "Fiyat bantlar arasında → nötr" });
    }
  }

  if (price != null && sma200 != null) {
    evaluated++;
    if (price > sma200) {
      sum++;
      items.push({ name: "Fiyat / SMA200", point: 1, detail: "Fiyat SMA200'ün üstünde → uzun vadeli yükseliş" });
    } else {
      sum--;
      items.push({ name: "Fiyat / SMA200", point: -1, detail: "Fiyat SMA200'ün altında → uzun vadeli düşüş" });
    }
  }

  const score = Math.max(-1, Math.min(1, sum / Math.max(evaluated, 1)));
  const reasons = items.filter((i) => i.point !== 0).map((i) => i.detail);

  return { score, reasons, items };
}

export function fundamentalScore(f: Fundamentals): FundamentalResult {
  const metrics: FundamentalMetric[] = [];
  let sum = 0;
  let n = 0;

  const add = (
    key: FundamentalMetric["key"],
    label: string,
    value: number | null,
    display: string,
    positive: boolean | null,
    posDetail: string,
    negDetail: string,
    neutralDetail: string
  ) => {
    let point = 0;
    let detail = neutralDetail;
    if (positive === true) {
      point = 1;
      detail = posDetail;
      sum++;
      n++;
    } else if (positive === false) {
      point = -1;
      detail = negDetail;
      sum--;
      n++;
    } else if (value == null) {
      detail = `${label} verisi yok`;
    }
    metrics.push({ key, label, value, display, point, detail });
  };

  add(
    "pe",
    "F/K",
    f.pe,
    f.pe != null ? f.pe.toFixed(1) : "—",
    f.pe == null ? null : f.pe > 0 && f.pe < 15 ? true : f.pe > 30 || f.pe <= 0 ? false : null,
    `F/K ${f.pe?.toFixed(1)} → sektör ortalamasının altında, ucuz`,
    f.pe != null && f.pe <= 0 ? "F/K negatif → kârlılık sorunu" : `F/K ${f.pe?.toFixed(1)} → pahalı`,
    f.pe != null ? `F/K ${f.pe.toFixed(1)} → nötr bölge` : "Veri yok"
  );

  add(
    "pb",
    "PD/DD",
    f.pb,
    f.pb != null ? f.pb.toFixed(2) : "—",
    f.pb == null ? null : f.pb < 1.5 ? true : f.pb > 4 ? false : null,
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} < 1.5 → varlık değeri ucuz` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} > 4 → varlık değeri pahalı` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} → nötr bölge` : "Veri yok"
  );

  add(
    "roe",
    "ROE",
    f.roe,
    f.roe != null ? pct(f.roe) : "—",
    f.roe == null ? null : f.roe > 0.15 ? true : f.roe < 0.05 ? false : null,
    f.roe != null ? `ROE ${pct(f.roe)} > %15 → güçlü özkaynak kârlılığı` : "",
    f.roe != null ? `ROE ${pct(f.roe)} < %5 → zayıf kârlılık` : "",
    f.roe != null ? `ROE ${pct(f.roe)} → nötr bölge` : "Veri yok"
  );

  add(
    "debtToEquity",
    "Borç/Özkaynak",
    f.debtToEquity,
    f.debtToEquity != null ? f.debtToEquity.toFixed(0) + "%" : "—",
    f.debtToEquity == null
      ? null
      : f.debtToEquity < 100
        ? true
        : f.debtToEquity > 200
          ? false
          : null,
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → düşük borçlanma` : "",
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → yüksek borçlanma` : "",
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → nötr bölge` : "Veri yok"
  );

  add(
    "revenueGrowth",
    "Gelir büyümesi",
    f.revenueGrowth,
    f.revenueGrowth != null ? pct(f.revenueGrowth) : "—",
    f.revenueGrowth == null ? null : f.revenueGrowth > 0.1 ? true : f.revenueGrowth < 0 ? false : null,
    f.revenueGrowth != null ? `Gelir büyümesi ${pct(f.revenueGrowth)} > %10 → hızlı büyüme` : "",
    f.revenueGrowth != null ? `Gelir büyümesi ${pct(f.revenueGrowth)} < 0 → daralma` : "",
    f.revenueGrowth != null ? `Gelir büyümesi ${pct(f.revenueGrowth)} → nötr bölge` : "Veri yok"
  );

  return { score: n > 0 ? sum / n : null, metrics };
}

export function finalSignal(tech: number, fund: number | null) {
  const raw = fund == null ? tech : 0.6 * tech + 0.4 * fund;
  const score = Math.round(raw * 100) / 100;
  const signal: Signal = score >= 0.4 ? "AL" : score <= -0.4 ? "SAT" : "TUT";
  return { score, signal } as const;
}

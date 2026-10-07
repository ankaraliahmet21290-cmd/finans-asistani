import type {
  Candle,
  FundamentalCategory,
  FundamentalMetric,
  FundamentalResult,
  Fundamentals,
  Indicators,
  ScoreItem,
  Signal,
  TechnicalResult,
  TimeframeKey,
  TrendStrength,
  VolatilityRisk,
} from "./types";

const last = <T>(arr: readonly T[] | undefined, n = 1): T | undefined =>
  arr && arr.length >= n ? arr[arr.length - n] : undefined;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function technicalScore(
  closes: number[],
  ind: Indicators,
  candles?: Candle[]
): TechnicalResult {
  const items: ScoreItem[] = [];

  const price = last(closes) ?? 0;
  const pricePrev = last(closes, 2);

  // --- KATEGORİ 1: ANA TREND & HAREKETLİ ORTALAMALAR (Kategori Ağırlığı: %35) ---

  // 1. Fiyat / SMA 200 Rejimi (Ağırlık: 1.2)
  const sma200 = last(ind.sma200);
  if (price != null && sma200 != null) {
    if (price > sma200) {
      items.push({
        name: "Fiyat / SMA200",
        point: 1,
        weight: 1.2,
        category: "trend",
        detail: "Fiyat SMA200'ün üstünde → uzun vadeli makro boğa piyasası bölgesi",
      });
    } else {
      items.push({
        name: "Fiyat / SMA200",
        point: -1,
        weight: 1.2,
        category: "trend",
        detail: "Fiyat SMA200'ün altında → uzun vadeli makro ayı piyasası bölgesi",
      });
    }
  }

  // 2. EMA 20 / EMA 50 Hızlı Trend (Ağırlık: 1.0)
  const ema20 = last(ind.ema20);
  const ema20Prev = last(ind.ema20, 2);
  const ema50 = last(ind.ema50);
  const ema50Prev = last(ind.ema50, 2);
  if (ema20 != null && ema50 != null) {
    if (ema20Prev != null && ema50Prev != null && ema20Prev <= ema50Prev && ema20 > ema50) {
      items.push({
        name: "EMA20 / EMA50",
        point: 1,
        weight: 1.0,
        category: "trend",
        detail: "Hızlı Golden Cross: EMA20, EMA50'yi yukarı kesti",
      });
    } else if (ema20Prev != null && ema50Prev != null && ema20Prev >= ema50Prev && ema20 < ema50) {
      items.push({
        name: "EMA20 / EMA50",
        point: -1,
        weight: 1.0,
        category: "trend",
        detail: "Hızlı Death Cross: EMA20, EMA50'yi aşağı kesti",
      });
    } else if (ema20 > ema50 && price > ema20) {
      items.push({
        name: "EMA20 / EMA50",
        point: 1,
        weight: 1.0,
        category: "trend",
        detail: "Fiyat > EMA20 > EMA50 → güçlü kısa-orta vade yükseliş trendi",
      });
    } else if (ema20 < ema50 && price < ema20) {
      items.push({
        name: "EMA20 / EMA50",
        point: -1,
        weight: 1.0,
        category: "trend",
        detail: "Fiyat < EMA20 < EMA50 → belirgin düşüş trendi baskısı",
      });
    } else {
      items.push({
        name: "EMA20 / EMA50",
        point: 0,
        weight: 0.6,
        category: "trend",
        detail: "Hareketli ortalamalar arası geçiş/konsolidasyon aşaması",
      });
    }
  }

  // 3. SMA 50 / SMA 200 (Ana Döngü - Ağırlık: 0.8)
  const sma50 = last(ind.sma50);
  const sma50Prev = last(ind.sma50, 2);
  const sma200Prev = last(ind.sma200, 2);
  if (sma50 != null && sma200 != null) {
    if (sma50Prev != null && sma200Prev != null && sma50Prev <= sma200Prev && sma50 > sma200) {
      items.push({
        name: "SMA50 / SMA200",
        point: 1,
        weight: 0.8,
        category: "trend",
        detail: "Golden Cross: SMA50, SMA200'ü yukarı kesti",
      });
    } else if (sma50Prev != null && sma200Prev != null && sma50Prev >= sma200Prev && sma50 < sma200) {
      items.push({
        name: "SMA50 / SMA200",
        point: -1,
        weight: 0.8,
        category: "trend",
        detail: "Death Cross: SMA50, SMA200'ü aşağı kesti",
      });
    } else if (sma50 > sma200) {
      items.push({
        name: "SMA50 / SMA200",
        point: 0.5,
        weight: 0.8,
        category: "trend",
        detail: "SMA50 > SMA200 → uzun vadeli yükseliş yapısı korunuyor",
      });
    } else {
      items.push({
        name: "SMA50 / SMA200",
        point: -0.5,
        weight: 0.8,
        category: "trend",
        detail: "SMA50 < SMA200 → uzun vadeli düşüş yapısı etkin",
      });
    }
  }

  // --- KATEGORİ 2: TREND GÜCÜ & PİYASA REJİMİ (Kategori Ağırlığı: %25) ---

  // 4. ADX (14) & +DI / -DI (Ağırlık: 1.0)
  let trendStrength: TrendStrength | undefined;
  const adxPoint = last(ind.adx);
  if (adxPoint) {
    const isStrong = adxPoint.adx >= 25;
    const isRanging = adxPoint.adx < 20;
    const isUp = adxPoint.pdi > adxPoint.mdi;

    trendStrength = {
      adx: Math.round(adxPoint.adx * 10) / 10,
      regime: isStrong ? "strong_trend" : isRanging ? "ranging" : "trending",
      direction: isUp ? "up" : "down",
    };

    if (isStrong) {
      if (isUp) {
        items.push({
          name: "ADX Trend Gücü",
          point: 1,
          weight: 1.0,
          category: "regime",
          detail: `ADX ${adxPoint.adx.toFixed(1)} ≥ 25 & +DI > -DI → güçlü boğa trend rejimi`,
        });
      } else {
        items.push({
          name: "ADX Trend Gücü",
          point: -1,
          weight: 1.0,
          category: "regime",
          detail: `ADX ${adxPoint.adx.toFixed(1)} ≥ 25 & -DI > +DI → güçlü ayı trend baskısı`,
        });
      }
    } else if (isRanging) {
      items.push({
        name: "ADX Trend Gücü",
        point: 0,
        weight: 1.0,
        category: "regime",
        detail: `ADX ${adxPoint.adx.toFixed(1)} < 20 → yatay / testere piyasası, osilatörlere öncelik verilmeli`,
      });
    } else {
      const pt = isUp ? 0.5 : -0.5;
      items.push({
        name: "ADX Trend Gücü",
        point: pt,
        weight: 1.0,
        category: "regime",
        detail: `ADX ${adxPoint.adx.toFixed(1)} → gelişen ılımlı trend (${isUp ? "+DI yukarı" : "-DI aşağı"})`,
      });
    }
  }

  // --- KATEGORİ 3: MOMENTUM & ZAMANLAMA (Kategori Ağırlığı: %25) ---

  // 5. MACD (12, 26, 9) (Ağırlık: 1.0)
  const m = last(ind.macd);
  const mp = last(ind.macd, 2);
  if (m?.MACD != null && m.signal != null && mp?.MACD != null && mp.signal != null) {
    if (mp.MACD <= mp.signal && m.MACD > m.signal) {
      items.push({
        name: "MACD(12,26,9)",
        point: 1,
        weight: 1.0,
        category: "momentum",
        detail: "MACD sinyal çizgisini yukarı kesti → AL teyidi",
      });
    } else if (mp.MACD >= mp.signal && m.MACD < m.signal) {
      items.push({
        name: "MACD(12,26,9)",
        point: -1,
        weight: 1.0,
        category: "momentum",
        detail: "MACD sinyal çizgisini aşağı kesti → SAT teyidi",
      });
    } else if (m.MACD > m.signal) {
      items.push({
        name: "MACD(12,26,9)",
        point: 0.5,
        weight: 0.8,
        category: "momentum",
        detail: "MACD sinyalin üzerinde pozitif bölgede",
      });
    } else {
      items.push({
        name: "MACD(12,26,9)",
        point: -0.5,
        weight: 0.8,
        category: "momentum",
        detail: "MACD sinyalin altında negatif bölgede",
      });
    }
  }

  // 6. RSI (14) (Ağırlık: 0.9 - Trend Rejimi Uyumlu)
  const rsi = last(ind.rsi);
  const isBullTrend = trendStrength?.regime === "strong_trend" && trendStrength.direction === "up";
  const isBearTrend = trendStrength?.regime === "strong_trend" && trendStrength.direction === "down";

  if (rsi != null) {
    if (rsi < 30) {
      if (isBearTrend) {
        items.push({
          name: "RSI(14)",
          point: 0.2,
          weight: 0.7,
          category: "momentum",
          detail: `RSI ${rsi.toFixed(1)} < 30 (aşırı satım), ancak güçlü ayı trendinde tepki alımları sınırlı kalabilir`,
        });
      } else {
        items.push({
          name: "RSI(14)",
          point: 1,
          weight: 0.9,
          category: "momentum",
          detail: `RSI ${rsi.toFixed(1)} < 30 → aşırı satım bölgesi (tepki alımı potansiyeli)`,
        });
      }
    } else if (rsi > 70) {
      if (isBullTrend) {
        // Güçlü boğa trendinde RSI > 70 bir satış değil, kuvvetli momentum koşusudur (Warren Buffett & Quant kuralı)
        items.push({
          name: "RSI(14)",
          point: 0.2,
          weight: 0.7,
          category: "momentum",
          detail: `RSI ${rsi.toFixed(1)} > 70 aşırı alımda, ancak ADX güçlü boğa trendini teyit ediyor (kuvvetli momentum koşusu)`,
        });
      } else {
        items.push({
          name: "RSI(14)",
          point: -1,
          weight: 0.9,
          category: "momentum",
          detail: `RSI ${rsi.toFixed(1)} > 70 → aşırı alım bölgesi (kâr satışı ve düzeltme riski)`,
        });
      }
    } else {
      items.push({
        name: "RSI(14)",
        point: 0,
        weight: 0.5,
        category: "momentum",
        detail: `RSI ${rsi.toFixed(1)} → dengeli nötr bölge`,
      });
    }
  }

  // 7. Stokastik Osilatör (14,3,3) (Ağırlık: 0.8)
  const stoch = last(ind.stoch);
  const stochPrev = last(ind.stoch, 2);
  if (stoch && stochPrev) {
    if (stochPrev.k <= stochPrev.d && stoch.k > stoch.d && stoch.k < 30) {
      items.push({
        name: "Stokastik(14,3)",
        point: 1,
        weight: 0.8,
        category: "momentum",
        detail: `Dipte (%K=${stoch.k.toFixed(0)}) %D'yi yukarı kesti → güçlü dip dönüş teyidi`,
      });
    } else if (stochPrev.k >= stochPrev.d && stoch.k < stoch.d && stoch.k > 70) {
      if (isBullTrend) {
        items.push({
          name: "Stokastik(14,3)",
          point: -0.3,
          weight: 0.6,
          category: "momentum",
          detail: `Tepede (%K=${stoch.k.toFixed(0)}) kısa vadeli osilatör soluklanması; ana trend yapısı güçlü`,
        });
      } else {
        items.push({
          name: "Stokastik(14,3)",
          point: -1,
          weight: 0.8,
          category: "momentum",
          detail: `Tepede (%K=${stoch.k.toFixed(0)}) %D'yi aşağı kesti → tepe yorulma teyidi`,
        });
      }
    } else if (stoch.k > stoch.d) {
      items.push({
        name: "Stokastik(14,3)",
        point: 0.5,
        weight: 0.6,
        category: "momentum",
        detail: `%K (${stoch.k.toFixed(0)}) > %D (${stoch.d.toFixed(0)}) → kısa vadeli pozitif momentum`,
      });
    } else {
      items.push({
        name: "Stokastik(14,3)",
        point: -0.5,
        weight: 0.6,
        category: "momentum",
        detail: `%K (${stoch.k.toFixed(0)}) < %D (${stoch.d.toFixed(0)}) → kısa vadeli negatif momentum`,
      });
    }
  }

  // --- KATEGORİ 4: HACİM & VOLATİLİTE TEYİDİ (Kategori Ağırlığı: %15) ---

  // 8. Hacim Teyidi (20G Hacim SMA - Ağırlık: 1.0)
  const volSma = last(ind.volSma20);
  const currentVol = candles ? last(candles)?.volume : undefined;
  if (volSma != null && currentVol != null && volSma > 0) {
    const volRatio = currentVol / volSma;
    const priceChange = pricePrev != null ? price - pricePrev : 0;

    if (volRatio >= 1.3 && priceChange > 0) {
      items.push({
        name: "Hacim Teyidi",
        point: 1,
        weight: 1.0,
        category: "volume",
        detail: `İşlem hacmi 20 günlük ortalamanın %${((volRatio - 1) * 100).toFixed(0)} üzerinde, alımlar hacimli`,
      });
    } else if (volRatio >= 1.3 && priceChange < 0) {
      items.push({
        name: "Hacim Teyidi",
        point: -1,
        weight: 1.0,
        category: "volume",
        detail: `İşlem hacmi 20 günlük ortalamanın %${((volRatio - 1) * 100).toFixed(0)} üzerinde, satışlar hacimli`,
      });
    } else if (volRatio < 0.7) {
      items.push({
        name: "Hacim Teyidi",
        point: 0,
        weight: 0.6,
        category: "volume",
        detail: `Düşük hacimli piyasa katılımı (ortalamanın %${(volRatio * 100).toFixed(0)}'i)`,
      });
    } else {
      items.push({
        name: "Hacim Teyidi",
        point: 0,
        weight: 0.6,
        category: "volume",
        detail: "İşlem hacmi olağan 20 günlük ortalamasında",
      });
    }
  }

  // 9. Bollinger Bantları (20, 2) (Ağırlık: 0.8)
  const bb = last(ind.bb);
  const bbPrev = last(ind.bb, 2);
  if (price != null && bb) {
    if (price < bb.lower) {
      items.push({
        name: "Bollinger(20,2)",
        point: 1,
        weight: 0.8,
        category: "volume",
        detail: "Fiyat alt bandın altında (istatistiksel aşırı satım)",
      });
    } else if (price > bb.upper) {
      items.push({
        name: "Bollinger(20,2)",
        point: -1,
        weight: 0.8,
        category: "volume",
        detail: "Fiyat üst bandın üstünde (istatistiksel aşırı alım)",
      });
    } else if (pricePrev != null && bbPrev && pricePrev < bbPrev.lower && price >= bb.lower) {
      items.push({
        name: "Bollinger(20,2)",
        point: 1,
        weight: 0.8,
        category: "volume",
        detail: "Fiyat alt banttan içeri döndü → toparlanma teyidi",
      });
    } else if (pricePrev != null && bbPrev && pricePrev > bbPrev.upper && price <= bb.upper) {
      items.push({
        name: "Bollinger(20,2)",
        point: -1,
        weight: 0.8,
        category: "volume",
        detail: "Fiyat üst banttan içeri döndü → kâr satışı teyidi",
      });
    } else {
      items.push({
        name: "Bollinger(20,2)",
        point: 0,
        weight: 0.4,
        category: "volume",
        detail: "Fiyat bant sınırları içinde olağan dalgalanmada",
      });
    }
  }

  // --- KATEGORİK AĞIRLIKLI HESAPLAMA (Weighted Technical Scoring) ---
  const CATEGORY_BASE_WEIGHTS: Record<string, number> = {
    trend: 0.35,     // %35: Ana Trend ve Hareketli Ortalamalar
    regime: 0.25,    // %25: Trend Gücü ve Piyasa Rejimi (ADX)
    momentum: 0.25,  // %25: Momentum ve Osilatörler (MACD, RSI, Stoch)
    volume: 0.15,    // %15: Hacim ve Volatilite Teyidi
  };

  const categoryScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let activeWeightSum = 0;

  for (const [cat, catBaseWeight] of Object.entries(CATEGORY_BASE_WEIGHTS)) {
    const catItems = items.filter((it) => it.category === cat);
    if (catItems.length === 0) continue;

    let catWeightedSum = 0;
    let catWeightTotal = 0;
    for (const it of catItems) {
      const w = it.weight ?? 1.0;
      catWeightedSum += it.point * w;
      catWeightTotal += w;
    }

    const catScore = catWeightTotal > 0 ? catWeightedSum / catWeightTotal : 0;
    categoryScores[cat] = Math.round(catScore * 100) / 100;
    totalWeightedScore += catScore * catBaseWeight;
    activeWeightSum += catBaseWeight;
  }

  // Dinamik yeniden normalizasyon (eksik kategori olursa ağırlıkları orantılı dağıt)
  const normalizedScore = activeWeightSum > 0 ? totalWeightedScore / activeWeightSum : 0;
  const clampedScore = Math.max(-1, Math.min(1, normalizedScore));
  const roundedScore = Math.round(clampedScore * 100) / 100;
  const signal: Signal = roundedScore >= 0.25 ? "AL" : roundedScore <= -0.25 ? "SAT" : "TUT";

  // --- ATR (14) - Dinamik Risk & Stop-Loss Hesabı ---
  let volatility: VolatilityRisk | undefined;
  const atrVal = last(ind.atr);
  if (atrVal != null && price > 0) {
    const atrPercent = (atrVal / price) * 100;
    // Spot hisse yatırımı için Stop-Loss her zaman fiyatın altı (-1.5 ATR), Kâr Al her zaman fiyatın üstüdür (+2.5 ATR)
    const stopLoss = Math.max(0, price - 1.5 * atrVal);
    const takeProfit = price + 2.5 * atrVal;

    volatility = {
      atr: Math.round(atrVal * 100) / 100,
      atrPercent: Math.round(atrPercent * 10) / 10,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskRewardRatio: 1.67,
    };
  }

  // Öne çıkan nedenleri önem/ağırlık derecesine göre sırala
  const reasons = items
    .filter((i) => i.point !== 0)
    .sort((a, b) => Math.abs((b.weight ?? 1) * b.point) - Math.abs((a.weight ?? 1) * a.point))
    .map((i) => i.detail);

  return {
    score: roundedScore,
    signal,
    reasons,
    items,
    categoryScores,
    volatility,
    trendStrength,
  };
}

export function fundamentalScore(f: Fundamentals, isBank: boolean = false): FundamentalResult {
  const metrics: FundamentalMetric[] = [];

  const add = (
    key: FundamentalMetric["key"],
    label: string,
    category: FundamentalCategory,
    weight: number,
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
    } else if (positive === false) {
      point = -1;
      detail = negDetail;
    } else if (value == null) {
      detail = `${label} verisi bulunamadı`;
    }
    metrics.push({ key, label, category, weight, value, display, point, detail });
  };

  // --- KATEGORİ 1: KÂRLILIK & VERİMLİLİK (Kategori Ağırlığı: Sanayi %35 / Banka %45) ---
  // 1. Net Kâr Marjı (Ağırlık: Sanayi 1.0 / Banka 0.5)
  add(
    "profitMargins",
    "Net Kâr Marjı",
    "profitability",
    isBank ? 0.5 : 1.0,
    f.profitMargins,
    f.profitMargins != null ? pct(f.profitMargins) : "—",
    f.profitMargins == null ? null : f.profitMargins > 0.1 ? true : f.profitMargins <= 0 ? false : null,
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} > %10 → yüksek kârlılık` : "",
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} ≤ 0 → net kârlılık yok / zarar` : "",
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} → dengeli marj` : "Veri yok"
  );

  // 2. Faaliyet Kâr Marjı (Ağırlık: Sanayi 1.0 / Banka 0.5)
  add(
    "operatingMargins",
    "Faaliyet Kâr Marjı",
    "profitability",
    isBank ? 0.5 : 1.0,
    f.operatingMargins,
    f.operatingMargins != null ? pct(f.operatingMargins) : "—",
    f.operatingMargins == null ? null : f.operatingMargins > 0.15 ? true : f.operatingMargins <= 0 ? false : null,
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} > %15 → operasyonel kâr güçlü` : "",
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} ≤ 0 → faaliyet kârı üretilemiyor` : "",
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} → standart faaliyet marjı` : "Veri yok"
  );

  // 3. ROE (Özkaynak Kârlılığı - Bankalarda 1 numaralı Warren Buffett kriteri! Ağırlık: Sanayi 0.8 / Banka 1.3)
  const roePositive = isBank
    ? f.roe != null && f.roe > 0.20
      ? true
      : f.roe != null && f.roe < 0.10
      ? false
      : null
    : f.roe != null && f.roe > 0.15
    ? true
    : f.roe != null && f.roe < 0.05
    ? false
    : null;

  add(
    "roe",
    "ROE (Özkaynak Kârı)",
    "profitability",
    isBank ? 1.3 : 0.8,
    f.roe,
    f.roe != null ? pct(f.roe) : "—",
    f.roe == null ? null : roePositive,
    f.roe != null ? `ROE ${pct(f.roe)} → ${isBank ? "mükemmel bankacılık özkaynak kârlılığı (Warren Buffett kriteri)" : "güçlü özkaynak kârlılığı"}` : "",
    f.roe != null ? `ROE ${pct(f.roe)} → sermaye kârlılığı zayıf` : "",
    f.roe != null ? `ROE ${pct(f.roe)} → ılımlı sermaye getirisi` : "Veri yok"
  );

  // 4. ROA (Aktif Kârlılığı - Bankalarda kritik verimlilik! Ağırlık: Sanayi 0.7 / Banka 1.1)
  const roaPositive = isBank
    ? f.roa != null && f.roa > 0.018
      ? true
      : f.roa != null && f.roa < 0.008
      ? false
      : null
    : f.roa != null && f.roa > 0.05
    ? true
    : f.roa != null && f.roa < 0.01
    ? false
    : null;

  add(
    "roa",
    "ROA (Aktif Kârlılığı)",
    "profitability",
    isBank ? 1.1 : 0.7,
    f.roa,
    f.roa != null ? pct(f.roa) : "—",
    f.roa == null ? null : roaPositive,
    f.roa != null ? `ROA ${pct(f.roa)} → ${isBank ? "banka varlıkları kâra dönüştürülüyor (>%1.8)" : "şirket varlıklarını verimli kâra dönüştürüyor"}` : "",
    f.roa != null ? `ROA ${pct(f.roa)} → aktif varlık kârlılığı düşük` : "",
    f.roa != null ? `ROA ${pct(f.roa)} → olağan aktif kârlılığı` : "Veri yok"
  );

  // --- KATEGORİ 2: DEĞERLEME & ÇARPANLAR (Kategori Ağırlığı: Sanayi %30 / Banka %40) ---
  // 5. PEG Oranı (Peter Lynch Büyüme Değerlemesi - Ağırlık: 1.2)
  add(
    "peg",
    "PEG (F/K / Büyüme)",
    "valuation",
    isBank ? 0.6 : 1.2,
    f.peg,
    f.peg != null ? f.peg.toFixed(2) : "—",
    f.peg == null ? null : f.peg > 0 && f.peg <= 1.0 ? true : f.peg > 2.0 || f.peg < 0 ? false : null,
    f.peg != null ? `PEG ${f.peg.toFixed(2)} ≤ 1.0 → kâr büyümesine göre cazip ve iskontolu` : "",
    f.peg != null && f.peg < 0
      ? "PEG negatif → kâr büyümesi zayıf"
      : `PEG ${f.peg?.toFixed(2)} > 2.0 → büyüme potansiyeline göre aşırı fiyatlanmış`,
    f.peg != null ? `PEG ${f.peg.toFixed(2)} → dengeli büyüme/fiyat oranı` : "Veri yok"
  );

  // 6. F/K (Fiyat/Kazanç - Bankalarda 2-7 ucuz, Sanayide 0-15 ucuz)
  const pePositive = isBank
    ? f.pe != null && f.pe > 0 && f.pe < 7
      ? true
      : f.pe != null && (f.pe > 12 || f.pe <= 0)
      ? false
      : null
    : f.pe != null && f.pe > 0 && f.pe < 15
    ? true
    : f.pe != null && (f.pe > 30 || f.pe <= 0)
    ? false
    : null;

  add(
    "pe",
    "F/K (Fiyat/Kazanç)",
    "valuation",
    1.0,
    f.pe,
    f.pe != null ? f.pe.toFixed(1) : "—",
    pePositive,
    `F/K ${f.pe?.toFixed(1)} → ${isBank ? "bankacılık çarpanlarına göre son derece ucuz" : "sektör ortalamasının altında, ucuz çarpan"}`,
    f.pe != null && f.pe <= 0 ? "F/K negatif → şirket net zarar açıklıyor" : `F/K ${f.pe?.toFixed(1)} → primli ve pahalı çarpan`,
    f.pe != null ? `F/K ${f.pe.toFixed(1)} → makul piyasa fiyatlaması` : "Veri yok"
  );

  // 7. PD/DD (Piyasa/Defter - Bankalarda < 0.9 iskontolu, Sanayide < 1.5)
  const pbPositive = isBank
    ? f.pb != null && f.pb < 0.9
      ? true
      : f.pb != null && f.pb > 1.8
      ? false
      : null
    : f.pb != null && f.pb < 1.5
    ? true
    : f.pb != null && f.pb > 4
    ? false
    : null;

  add(
    "pb",
    "PD/DD (Piyasa/Defter)",
    "valuation",
    isBank ? 1.0 : 0.6,
    f.pb,
    f.pb != null ? f.pb.toFixed(2) : "—",
    pbPositive,
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} → ${isBank ? "defter değerine göre iskontolu banka çarpanı" : "net varlık değerine göre ucuz"}` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} → ${isBank ? "özkaynaklarına göre primli banka fiyatlaması" : "özkaynaklarına göre yüksek primli"}` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} → makul defter değeri seviyesi` : "Veri yok"
  );

  // --- KATEGORİ 3: MALİ SAĞLAMLIK & LİKİDİTE (Sanayide %25, Bankalarda Sektör Standardı Gereği 0%) ---
  // Bankalarda mevduatlar bilanço borcu sayıldığından Cari Oran ve Borç/Özkaynak uygulanamaz!
  if (isBank) {
    add(
      "currentRatio",
      "Cari Oran (Likidite)",
      "solvency",
      0.0,
      f.currentRatio,
      "—",
      null,
      "",
      "",
      "Bankacılık sektörü: Mevduat yasal borç sayıldığından sanayi likidite rasyoları model dışıdır"
    );
    add(
      "debtToEquity",
      "Borç/Özkaynak",
      "solvency",
      0.0,
      f.debtToEquity,
      "—",
      null,
      "",
      "",
      "Bankacılık sektörü: Mevduat kaldıracı nedeniyle sanayi borçluluk rasyosu model dışıdır"
    );
  } else {
    // 8. Cari Oran (Current Ratio / Likidite - Ağırlık: 1.0)
    add(
      "currentRatio",
      "Cari Oran (Likidite)",
      "solvency",
      1.0,
      f.currentRatio,
      f.currentRatio != null ? f.currentRatio.toFixed(2) : "—",
      f.currentRatio == null ? null : f.currentRatio >= 1.2 ? true : f.currentRatio < 1.0 ? false : null,
      f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} ≥ 1.2 → kısa vadeli borç ödeme kabiliyeti güçlü` : "",
      f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} < 1.0 → kısa vadeli likidite sıkışıklığı riski` : "",
      f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} → kabul edilebilir likidite tamponu` : "Veri yok"
    );

    // 9. Borç / Özkaynak (Ağırlık: 1.0)
    add(
      "debtToEquity",
      "Borç/Özkaynak",
      "solvency",
      1.0,
      f.debtToEquity,
      f.debtToEquity != null ? f.debtToEquity.toFixed(0) + "%" : "—",
      f.debtToEquity == null ? null : f.debtToEquity < 100 ? true : f.debtToEquity > 200 ? false : null,
      f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → düşük borçluluk riski` : "",
      f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → yüksek borçlanma baskısı` : "",
      f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → dengeli borç yapısı` : "Veri yok"
    );
  }

  // --- KATEGORİ 4: BÜYÜME & TEMETTÜ (Sanayide %10 / Bankada %15) ---
  // 10. Gelir Büyümesi (Ağırlık: 1.0)
  add(
    "revenueGrowth",
    "Gelir Büyümesi",
    "growth",
    1.0,
    f.revenueGrowth,
    f.revenueGrowth != null ? pct(f.revenueGrowth) : "—",
    f.revenueGrowth == null ? null : f.revenueGrowth > 0.1 ? true : f.revenueGrowth < 0 ? false : null,
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} > %10 → ciro artış trendi güçlü` : "",
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} < 0 → ciro daralması` : "",
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} → ılımlı satış artışı` : "Veri yok"
  );

  // 11. Temettü Verimi (Ağırlık: 0.8)
  add(
    "dividendYield",
    "Temettü Verimi",
    "growth",
    0.8,
    f.dividendYield,
    f.dividendYield != null ? pct(f.dividendYield) : "—",
    f.dividendYield == null ? null : f.dividendYield > 0.02 ? true : null,
    f.dividendYield != null ? `Temettü Verimi ${pct(f.dividendYield)} > %2 → nakit kâr payı getirisi cazip` : "",
    "",
    f.dividendYield != null && f.dividendYield > 0
      ? `Temettü Verimi ${pct(f.dividendYield)}`
      : "Temettü dağıtımı yok veya veri eksik"
  );

  // --- KATEGORİK AĞIRLIKLI HESAPLAMA (Weighted Fundamental Scoring) ---
  const FUND_CATEGORY_BASE_WEIGHTS: Record<FundamentalCategory, number> = isBank
    ? {
        profitability: 0.45, // %45: ROE & ROA (Bankanın motoru)
        valuation: 0.40,     // %40: F/K & PD/DD
        growth: 0.15,        // %15: Büyüme & Temettü
        solvency: 0.0,       // %0: Sanayi borç rasyoları devredışı
      }
    : {
        profitability: 0.35,  // %35: Kârlılık & Verimlilik
        valuation: 0.30,      // %30: Değerleme & Çarpanlar
        solvency: 0.25,       // %25: Mali Sağlamlık & Borç
        growth: 0.10,         // %10: Büyüme & Temettü
      };

  const categoryScores: Partial<Record<FundamentalCategory, number>> = {};
  let totalWeightedScore = 0;
  let activeWeightSum = 0;

  for (const [catStr, catBaseWeight] of Object.entries(FUND_CATEGORY_BASE_WEIGHTS)) {
    if (catBaseWeight <= 0) continue;
    const cat = catStr as FundamentalCategory;
    const catMetrics = metrics.filter((m) => m.category === cat && m.value != null && (m.weight ?? 1) > 0);
    if (catMetrics.length === 0) continue;

    let catWeightedSum = 0;
    let catWeightTotal = 0;
    for (const m of catMetrics) {
      const w = m.weight ?? 1.0;
      catWeightedSum += m.point * w;
      catWeightTotal += w;
    }

    const catScore = catWeightTotal > 0 ? catWeightedSum / catWeightTotal : 0;
    categoryScores[cat] = Math.round(catScore * 100) / 100;
    totalWeightedScore += catScore * catBaseWeight;
    activeWeightSum += catBaseWeight;
  }

  const rawScore = activeWeightSum > 0 ? totalWeightedScore / activeWeightSum : null;
  const score = rawScore != null ? Math.round(rawScore * 100) / 100 : null;
  const signal: Signal = score == null ? "TUT" : score >= 0.25 ? "AL" : score <= -0.25 ? "SAT" : "TUT";

  return { score, signal, metrics, categoryScores };
}

/**
 * Dinamik Zaman Dilimi Ağırlıklandırması (Timeframe-Adaptive Weights):
 * - Gün içi / Scalping (5dk - 30dk): Fiyatı bilanço değil likidite/teknik belirler (%90-%95 Teknik)
 * - Kısa-Orta Vade (1s - 4s): Dalga trendleri (%70-%80 Teknik, %20-%30 Temel)
 * - Günlük (1d): Klasik swing karar desteği (%60 Teknik, %40 Temel)
 * - Haftalık / Aylık (1wk, 1mo): Warren Buffett Değer Yatırımı (%35-%45 Teknik, %55-%65 Temel)
 */
export function getTimeframeWeights(
  tf: TimeframeKey = "1d",
  hasFund: boolean
): { techWeight: number; fundWeight: number } {
  if (!hasFund) {
    return { techWeight: 1.0, fundWeight: 0.0 };
  }

  switch (tf) {
    case "5m":
    case "10m":
      return { techWeight: 0.95, fundWeight: 0.05 };
    case "15m":
    case "30m":
      return { techWeight: 0.90, fundWeight: 0.10 };
    case "1h":
    case "2h":
      return { techWeight: 0.80, fundWeight: 0.20 };
    case "4h":
      return { techWeight: 0.70, fundWeight: 0.30 };
    case "1d":
      return { techWeight: 0.60, fundWeight: 0.40 };
    case "1wk":
      return { techWeight: 0.45, fundWeight: 0.55 };
    case "1mo":
      return { techWeight: 0.35, fundWeight: 0.65 };
    default:
      return { techWeight: 0.60, fundWeight: 0.40 };
  }
}

export function finalSignal(
  tech: number,
  fund: number | null,
  timeframe: TimeframeKey = "1d"
) {
  const { techWeight, fundWeight } = getTimeframeWeights(timeframe, fund != null);
  const raw = fund == null ? tech : techWeight * tech + fundWeight * fund;
  const score = Math.round(raw * 100) / 100;
  const signal: Signal = score >= 0.28 ? "AL" : score <= -0.28 ? "SAT" : "TUT";
  return { score, signal, techWeight, fundWeight } as const;
}

export function getHybridAssessment(
  techSignal: Signal,
  fundSignal: Signal | null,
  techScore: number,
  fundScore: number | null,
  timeframe: TimeframeKey = "1d"
) {
  const hasFund = fundScore != null && fundSignal != null;
  const { techWeight, fundWeight } = getTimeframeWeights(timeframe, hasFund);

  if (!hasFund) {
    return {
      label: "Yalnızca Teknik Analiz Kararı",
      description: "Temel bilanço verisi bulunmadığı için nihai karar %100 teknik göstergelere dayalıdır.",
      techWeight: 1.0,
      fundWeight: 0.0,
      alignment: "neutral" as const,
    };
  }

  const techPct = Math.round(techWeight * 100);
  const fundPct = Math.round(fundWeight * 100);
  const weightContext = `[Periyot Ağırlığı: %${techPct} Teknik / %${fundPct} Temel]`;

  if (techSignal === "AL" && fundSignal === "AL") {
    return {
      label: `Güçlü Uyum (Teknik & Temel AL) ${weightContext}`,
      description: "Hem teknik indikatörler yukarı yönlü momentum üretiyor hem de şirket çarpanları ve kârlılığı güçlü alım bölgesinde.",
      techWeight,
      fundWeight,
      alignment: "strong" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "SAT") {
    return {
      label: `Güçlü Uyum (Teknik & Temel SAT) ${weightContext}`,
      description: "Hem teknik grafikler düşüş trendinde hem de şirket bilanço rasyoları negatif baskı yaratıyor.",
      techWeight,
      fundWeight,
      alignment: "strong" as const,
    };
  }

  if (techSignal === "AL" && fundSignal === "TUT") {
    return {
      label: `Teknik Destekli Alım (Temel Dengeli) ${weightContext}`,
      description: "Teknik momentum ve kırılımlar güçlü AL üretirken şirket temel rasyoları makul ve dengeli seyrediyor.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "TUT" && fundSignal === "AL") {
    return {
      label: `Temel Değer Fırsatı (Teknik Beklemede) ${weightContext}`,
      description: "Şirketin finansalları ve kârlılığı çok cazip ancak fiyatta henüz güçlü bir teknik hareket başlamamış.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "TUT") {
    return {
      label: `Teknik Düzeltme Baskısı (Temel Nötr) ${weightContext}`,
      description: "Kısa/orta vadeli teknik göstergeler aşırı alım ya da satış baskısı işaret ediyor; temel yapı nötr.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "TUT" && fundSignal === "SAT") {
    return {
      label: `Temel Zayıflık Uyarısı (Teknik Kararsız) ${weightContext}`,
      description: "Hisse çarpanları pahalı veya borçluluk yüksek; teknik yön yatay olsa da temkinli olunmalı.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "AL" && fundSignal === "SAT") {
    return {
      label: `Ayrışan Sinyal (Teknik AL, Temel Zayıf) ${weightContext}`,
      description: "Teknik olarak yukarı tepki/momentumu var ancak temel rasyolar pahalılık gösteriyor. Yakın stop-loss ile takip önerilir.",
      techWeight,
      fundWeight,
      alignment: "divergent" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "AL") {
    return {
      label: `Ayrışan Sinyal (Teknik SAT, Temel Ucuz) ${weightContext}`,
      description: "Şirket temel olarak çok ucuz ve kârlı olsa da fiyatta teknik satış baskısı sürüyor. Kademeli alım veya dönüş teyidi beklenebilir.",
      techWeight,
      fundWeight,
      alignment: "divergent" as const,
    };
  }

  return {
    label: `Nötr / Dengeli Görünüm ${weightContext}`,
    description: "Teknik ve temel göstergeler belirgin bir yön kırılımı üretmiyor; bekle-gör stratejisi önerilir.",
    techWeight,
    fundWeight,
    alignment: "neutral" as const,
  };
}

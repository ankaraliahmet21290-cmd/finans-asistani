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
  let sum = 0;
  let evaluated = 0;

  const price = last(closes) ?? 0;
  const pricePrev = last(closes, 2);

  // 1. RSI (14) - Aşırı Alım / Satım
  const rsi = last(ind.rsi);
  if (rsi != null) {
    evaluated++;
    if (rsi < 30) {
      sum++;
      items.push({ name: "RSI(14)", point: 1, detail: `RSI ${rsi.toFixed(1)} < 30 → aşırı satım (tepki potansiyeli)` });
    } else if (rsi > 70) {
      sum--;
      items.push({ name: "RSI(14)", point: -1, detail: `RSI ${rsi.toFixed(1)} > 70 → aşırı alım (kâr satışı riski)` });
    } else {
      items.push({ name: "RSI(14)", point: 0, detail: `RSI ${rsi.toFixed(1)} → dengeli nötr bölge` });
    }
  }

  // 2. Stokastik Osilatör (14,3,3) - Hızlı Dönüş Teyidi
  const stoch = last(ind.stoch);
  const stochPrev = last(ind.stoch, 2);
  if (stoch && stochPrev) {
    evaluated++;
    if (stochPrev.k <= stochPrev.d && stoch.k > stoch.d && stoch.k < 30) {
      sum += 1;
      items.push({
        name: "Stokastik(14,3)",
        point: 1,
        detail: `Dipte (%K=${stoch.k.toFixed(0)}) %D'yi yukarı kesti → güçlü dip dönüş teyidi`,
      });
    } else if (stochPrev.k >= stochPrev.d && stoch.k < stoch.d && stoch.k > 70) {
      sum -= 1;
      items.push({
        name: "Stokastik(14,3)",
        point: -1,
        detail: `Tepede (%K=${stoch.k.toFixed(0)}) %D'yi aşağı kesti → tepe yorulma teyidi`,
      });
    } else if (stoch.k > stoch.d) {
      sum += 0.5;
      items.push({
        name: "Stokastik(14,3)",
        point: 0.5,
        detail: `%K (${stoch.k.toFixed(0)}) > %D (${stoch.d.toFixed(0)}) → kısa vadeli pozitif momentum`,
      });
    } else {
      sum -= 0.5;
      items.push({
        name: "Stokastik(14,3)",
        point: -0.5,
        detail: `%K (${stoch.k.toFixed(0)}) < %D (${stoch.d.toFixed(0)}) → kısa vadeli negatif momentum`,
      });
    }
  }

  // 3. MACD (12, 26, 9) - Orta Vade Trend Momentumu
  const m = last(ind.macd);
  const mp = last(ind.macd, 2);
  if (m?.MACD != null && m.signal != null && mp?.MACD != null && mp.signal != null) {
    evaluated++;
    if (mp.MACD <= mp.signal && m.MACD > m.signal) {
      sum++;
      items.push({ name: "MACD(12,26,9)", point: 1, detail: "MACD sinyal çizgisini yukarı kesti → AL teyidi" });
    } else if (mp.MACD >= mp.signal && m.MACD < m.signal) {
      sum--;
      items.push({ name: "MACD(12,26,9)", point: -1, detail: "MACD sinyal çizgisini aşağı kesti → SAT teyidi" });
    } else if (m.MACD > m.signal) {
      sum += 0.5;
      items.push({
        name: "MACD(12,26,9)",
        point: 0.5,
        detail: "MACD sinyalin üzerinde pozitif bölgede",
      });
    } else {
      sum -= 0.5;
      items.push({
        name: "MACD(12,26,9)",
        point: -0.5,
        detail: "MACD sinyalin altında negatif bölgede",
      });
    }
  }

  // 4. EMA 20 / EMA 50 (Hızlı Trend Takibi)
  const ema20 = last(ind.ema20);
  const ema20Prev = last(ind.ema20, 2);
  const ema50 = last(ind.ema50);
  const ema50Prev = last(ind.ema50, 2);
  if (ema20 != null && ema50 != null) {
    evaluated++;
    if (ema20Prev != null && ema50Prev != null && ema20Prev <= ema50Prev && ema20 > ema50) {
      sum++;
      items.push({ name: "EMA20 / EMA50", point: 1, detail: "Hızlı Golden Cross: EMA20, EMA50'yi yukarı kesti" });
    } else if (ema20Prev != null && ema50Prev != null && ema20Prev >= ema50Prev && ema20 < ema50) {
      sum--;
      items.push({ name: "EMA20 / EMA50", point: -1, detail: "Hızlı Death Cross: EMA20, EMA50'yi aşağı kesti" });
    } else if (ema20 > ema50 && price > ema20) {
      sum++;
      items.push({ name: "EMA20 / EMA50", point: 1, detail: "Fiyat > EMA20 > EMA50 → güçlü kısa-orta vade boğa trendi" });
    } else if (ema20 < ema50 && price < ema20) {
      sum--;
      items.push({ name: "EMA20 / EMA50", point: -1, detail: "Fiyat < EMA20 < EMA50 → belirgin ayı trendi" });
    } else {
      items.push({ name: "EMA20 / EMA50", point: 0, detail: "Hareketli ortalamalar arası geçiş aşaması" });
    }
  }

  // 5. SMA 50 / SMA 200 (Ana Döngü Golden / Death Cross)
  const sma50 = last(ind.sma50);
  const sma50Prev = last(ind.sma50, 2);
  const sma200 = last(ind.sma200);
  const sma200Prev = last(ind.sma200, 2);
  if (sma50 != null && sma200 != null) {
    evaluated++;
    if (sma50Prev != null && sma200Prev != null && sma50Prev <= sma200Prev && sma50 > sma200) {
      sum++;
      items.push({ name: "SMA50 / SMA200", point: 1, detail: "Golden Cross: SMA50, SMA200'ü yukarı kesti" });
    } else if (sma50Prev != null && sma200Prev != null && sma50Prev >= sma200Prev && sma50 < sma200) {
      sum--;
      items.push({ name: "SMA50 / SMA200", point: -1, detail: "Death Cross: SMA50, SMA200'ü aşağı kesti" });
    } else if (sma50 > sma200) {
      sum += 0.5;
      items.push({ name: "SMA50 / SMA200", point: 0.5, detail: "SMA50 > SMA200 → uzun vadeli yükseliş yapısı" });
    } else {
      sum -= 0.5;
      items.push({ name: "SMA50 / SMA200", point: -0.5, detail: "SMA50 < SMA200 → uzun vadeli düşüş yapısı" });
    }
  }

  // 6. Fiyat / SMA 200 Rejimi
  if (price != null && sma200 != null) {
    evaluated++;
    if (price > sma200) {
      sum++;
      items.push({ name: "Fiyat / SMA200", point: 1, detail: "Fiyat SMA200'ün üstünde → uzun vadeli boğa piyasası" });
    } else {
      sum--;
      items.push({ name: "Fiyat / SMA200", point: -1, detail: "Fiyat SMA200'ün altında → uzun vadeli ayı piyasası" });
    }
  }

  // 7. Bollinger Bantları (20, 2)
  const bb = last(ind.bb);
  const bbPrev = last(ind.bb, 2);
  if (price != null && bb) {
    evaluated++;
    if (price < bb.lower) {
      sum++;
      items.push({ name: "Bollinger(20,2)", point: 1, detail: "Fiyat alt bandın altında (istatistiksel aşırı satım)" });
    } else if (price > bb.upper) {
      sum--;
      items.push({ name: "Bollinger(20,2)", point: -1, detail: "Fiyat üst bandın üstünde (istatistiksel aşırı alım)" });
    } else if (pricePrev != null && bbPrev && pricePrev < bbPrev.lower && price >= bb.lower) {
      sum++;
      items.push({ name: "Bollinger(20,2)", point: 1, detail: "Fiyat alt banttan içeri döndü → toparlanma teyidi" });
    } else if (pricePrev != null && bbPrev && pricePrev > bbPrev.upper && price <= bb.upper) {
      sum--;
      items.push({ name: "Bollinger(20,2)", point: -1, detail: "Fiyat üst banttan içeri döndü → kâr satışı teyidi" });
    } else {
      items.push({ name: "Bollinger(20,2)", point: 0, detail: "Fiyat bant sınırları içinde normal dalgalanmada" });
    }
  }

  // 8. ADX (14) - Trend Gücü & Piyasa Rejimi Filtresi
  let trendStrength: TrendStrength | undefined;
  const adxPoint = last(ind.adx);
  if (adxPoint) {
    evaluated++;
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
        sum++;
        items.push({
          name: "ADX Trend Gücü",
          point: 1,
          detail: `ADX ${adxPoint.adx.toFixed(1)} > 25 & +DI > -DI → güçlü boğa trendi rejimi`,
        });
      } else {
        sum--;
        items.push({
          name: "ADX Trend Gücü",
          point: -1,
          detail: `ADX ${adxPoint.adx.toFixed(1)} > 25 & -DI > +DI → güçlü ayı trendi baskısı`,
        });
      }
    } else if (isRanging) {
      items.push({
        name: "ADX Trend Gücü",
        point: 0,
        detail: `ADX ${adxPoint.adx.toFixed(1)} < 20 → yatay / testere piyasası, osilatörlere dikkat edilmeli`,
      });
    } else {
      const pt = isUp ? 0.5 : -0.5;
      sum += pt;
      items.push({
        name: "ADX Trend Gücü",
        point: pt,
        detail: `ADX ${adxPoint.adx.toFixed(1)} → ılımlı trend (${isUp ? "+DI yukarı" : "-DI aşağı"})`,
      });
    }
  }

  // 9. Hacim Teyidi (Volume vs SMA20)
  const volSma = last(ind.volSma20);
  const currentVol = candles ? last(candles)?.volume : undefined;
  if (volSma != null && currentVol != null && volSma > 0) {
    evaluated++;
    const volRatio = currentVol / volSma;
    const priceChange = pricePrev != null ? price - pricePrev : 0;

    if (volRatio >= 1.3 && priceChange > 0) {
      sum++;
      items.push({
        name: "Hacim Teyidi",
        point: 1,
        detail: `İşlem hacmi 20 günlük ortalamanın %${((volRatio - 1) * 100).toFixed(0)} üzerinde, alımlar hacimli`,
      });
    } else if (volRatio >= 1.3 && priceChange < 0) {
      sum--;
      items.push({
        name: "Hacim Teyidi",
        point: -1,
        detail: `İşlem hacmi 20 günlük ortalamanın %${((volRatio - 1) * 100).toFixed(0)} üzerinde, satışlar hacimli`,
      });
    } else if (volRatio < 0.7) {
      items.push({
        name: "Hacim Teyidi",
        point: 0,
        detail: `Düşük hacimli piyasa katılımı (ortalamanın %${(volRatio * 100).toFixed(0)}'i)`,
      });
    } else {
      items.push({
        name: "Hacim Teyidi",
        point: 0,
        detail: "İşlem hacmi olağan 20 günlük ortalamasında",
      });
    }
  }

  // 10. ATR (14) - Dinamik Risk & Stop-Loss Hesabı
  let volatility: VolatilityRisk | undefined;
  const atrVal = last(ind.atr);
  if (atrVal != null && price > 0) {
    const atrPercent = (atrVal / price) * 100;
    const isBullish = sum > 0;
    const stopLoss = isBullish ? Math.max(0, price - 1.5 * atrVal) : price + 1.5 * atrVal;
    const takeProfit = isBullish ? price + 2.5 * atrVal : Math.max(0, price - 2.5 * atrVal);

    volatility = {
      atr: Math.round(atrVal * 100) / 100,
      atrPercent: Math.round(atrPercent * 10) / 10,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskRewardRatio: 1.67,
    };
  }

  const score = Math.max(-1, Math.min(1, sum / Math.max(evaluated, 1)));
  const roundedScore = Math.round(score * 100) / 100;
  const signal: Signal = roundedScore >= 0.28 ? "AL" : roundedScore <= -0.28 ? "SAT" : "TUT";
  const reasons = items.filter((i) => i.point !== 0).map((i) => i.detail);

  return {
    score: roundedScore,
    signal,
    reasons,
    items,
    volatility,
    trendStrength,
  };
}

export function fundamentalScore(f: Fundamentals): FundamentalResult {
  const metrics: FundamentalMetric[] = [];
  let sum = 0;
  let n = 0;

  const add = (
    key: FundamentalMetric["key"],
    label: string,
    category: FundamentalCategory,
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
      detail = `${label} verisi bulunamadı`;
    }
    metrics.push({ key, label, category, value, display, point, detail });
  };

  // --- KATEGORİ 1: DEĞERLEME & ÇARPANLAR (Valuation) ---
  // 1. Fiyat / Kazanç (F/K)
  add(
    "pe",
    "F/K (Fiyat/Kazanç)",
    "valuation",
    f.pe,
    f.pe != null ? f.pe.toFixed(1) : "—",
    f.pe == null ? null : f.pe > 0 && f.pe < 15 ? true : f.pe > 30 || f.pe <= 0 ? false : null,
    `F/K ${f.pe?.toFixed(1)} → sektör ortalamasının altında, ucuz çarpan`,
    f.pe != null && f.pe <= 0 ? "F/K negatif → şirket net zarar açıklıyor" : `F/K ${f.pe?.toFixed(1)} → primli ve pahalı çarpan`,
    f.pe != null ? `F/K ${f.pe.toFixed(1)} → makul piyasa fiyatlaması` : "Veri yok"
  );

  // 2. Piyasa Değeri / Defter Değeri (PD/DD)
  add(
    "pb",
    "PD/DD (Piyasa/Defter)",
    "valuation",
    f.pb,
    f.pb != null ? f.pb.toFixed(2) : "—",
    f.pb == null ? null : f.pb < 1.5 ? true : f.pb > 4 ? false : null,
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} < 1.5 → net varlık değerine göre ucuz` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} > 4 → özkaynaklarına göre yüksek primli` : "",
    f.pb != null ? `PD/DD ${f.pb.toFixed(2)} → makul defter değeri seviyesi` : "Veri yok"
  );

  // 3. PEG Oranı (Peter Lynch Büyüme Değerlemesi)
  add(
    "peg",
    "PEG (F/K / Büyüme)",
    "valuation",
    f.peg,
    f.peg != null ? f.peg.toFixed(2) : "—",
    f.peg == null ? null : f.peg > 0 && f.peg <= 1.0 ? true : f.peg > 2.0 || f.peg < 0 ? false : null,
    f.peg != null ? `PEG ${f.peg.toFixed(2)} ≤ 1.0 → kâr büyümesine göre cazip ve iskontolu` : "",
    f.peg != null && f.peg < 0
      ? "PEG negatif → kâr büyümesi zayıf"
      : `PEG ${f.peg?.toFixed(2)} > 2.0 → büyüme potansiyeline göre aşırı fiyatlanmış`,
    f.peg != null ? `PEG ${f.peg.toFixed(2)} → dengeli büyüme/fiyat oranı` : "Veri yok"
  );

  // --- KATEGORİ 2: KÂRLILIK & VERİMLİLİK (Profitability) ---
  // 4. ROE (Özkaynak Kârlılığı)
  add(
    "roe",
    "ROE (Özkaynak Kârı)",
    "profitability",
    f.roe,
    f.roe != null ? pct(f.roe) : "—",
    f.roe == null ? null : f.roe > 0.15 ? true : f.roe < 0.05 ? false : null,
    f.roe != null ? `ROE ${pct(f.roe)} > %15 → güçlü özkaynak kârlılığı` : "",
    f.roe != null ? `ROE ${pct(f.roe)} < %5 → sermaye kârlılığı zayıf` : "",
    f.roe != null ? `ROE ${pct(f.roe)} → ılımlı sermaye getirisi` : "Veri yok"
  );

  // 5. ROA (Aktif Kârlılığı)
  add(
    "roa",
    "ROA (Aktif Kârlılığı)",
    "profitability",
    f.roa,
    f.roa != null ? pct(f.roa) : "—",
    f.roa == null ? null : f.roa > 0.05 ? true : f.roa < 0.01 ? false : null,
    f.roa != null ? `ROA ${pct(f.roa)} > %5 → şirket varlıklarını verimli kâra dönüştürüyor` : "",
    f.roa != null ? `ROA ${pct(f.roa)} < %1 → aktif varlık verimliliği düşük` : "",
    f.roa != null ? `ROA ${pct(f.roa)} → olağan aktif kârlılığı` : "Veri yok"
  );

  // 6. Net Kâr Marjı
  add(
    "profitMargins",
    "Net Kâr Marjı",
    "profitability",
    f.profitMargins,
    f.profitMargins != null ? pct(f.profitMargins) : "—",
    f.profitMargins == null ? null : f.profitMargins > 0.1 ? true : f.profitMargins <= 0 ? false : null,
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} > %10 → yüksek net kâr marjı` : "",
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} ≤ 0 → net kârlılık yok/zarar` : "",
    f.profitMargins != null ? `Net Kâr Marjı ${pct(f.profitMargins)} → dengeli marj` : "Veri yok"
  );

  // 7. Faaliyet Kâr Marjı (Operating Margin)
  add(
    "operatingMargins",
    "Faaliyet Kâr Marjı",
    "profitability",
    f.operatingMargins,
    f.operatingMargins != null ? pct(f.operatingMargins) : "—",
    f.operatingMargins == null ? null : f.operatingMargins > 0.15 ? true : f.operatingMargins <= 0 ? false : null,
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} > %15 → ana faaliyet kârı güçlü` : "",
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} ≤ 0 → operasyonel kâr üretilemiyor` : "",
    f.operatingMargins != null ? `Faaliyet Marjı ${pct(f.operatingMargins)} → standart faaliyet marjı` : "Veri yok"
  );

  // --- KATEGORİ 3: MALİ SAĞLAMLIK & LİKİDİTE (Solvency & Liquidity) ---
  // 8. Borç / Özkaynak
  add(
    "debtToEquity",
    "Borç/Özkaynak",
    "solvency",
    f.debtToEquity,
    f.debtToEquity != null ? f.debtToEquity.toFixed(0) + "%" : "—",
    f.debtToEquity == null ? null : f.debtToEquity < 100 ? true : f.debtToEquity > 200 ? false : null,
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → düşük borçluluk riski` : "",
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → yüksek borçlanma baskısı` : "",
    f.debtToEquity != null ? `Borç/Özkaynak %${f.debtToEquity.toFixed(0)} → dengeli borç yapısı` : "Veri yok"
  );

  // 9. Cari Oran (Current Ratio - Likidite)
  add(
    "currentRatio",
    "Cari Oran (Likidite)",
    "solvency",
    f.currentRatio,
    f.currentRatio != null ? f.currentRatio.toFixed(2) : "—",
    f.currentRatio == null ? null : f.currentRatio >= 1.2 ? true : f.currentRatio < 1.0 ? false : null,
    f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} ≥ 1.2 → kısa vadeli borç ödeme kabiliyeti güçlü` : "",
    f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} < 1.0 → kısa vadeli likidite sıkışıklığı riski` : "",
    f.currentRatio != null ? `Cari Oran ${f.currentRatio.toFixed(2)} → kabul edilebilir likidite tamponu` : "Veri yok"
  );

  // --- KATEGORİ 4: BÜYÜME & TEMETTÜ (Growth & Yield) ---
  // 10. Gelir Büyümesi
  add(
    "revenueGrowth",
    "Gelir Büyümesi",
    "growth",
    f.revenueGrowth,
    f.revenueGrowth != null ? pct(f.revenueGrowth) : "—",
    f.revenueGrowth == null ? null : f.revenueGrowth > 0.1 ? true : f.revenueGrowth < 0 ? false : null,
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} > %10 → ciro artış trendi güçlü` : "",
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} < 0 → ciro daralması` : "",
    f.revenueGrowth != null ? `Gelir Büyümesi ${pct(f.revenueGrowth)} → ılımlı satış artışı` : "Veri yok"
  );

  // 11. Temettü Verimi
  add(
    "dividendYield",
    "Temettü Verimi",
    "growth",
    f.dividendYield,
    f.dividendYield != null ? pct(f.dividendYield) : "—",
    f.dividendYield == null ? null : f.dividendYield > 0.02 ? true : null,
    f.dividendYield != null ? `Temettü Verimi ${pct(f.dividendYield)} > %2 → nakit kâr payı getirisi cazip` : "",
    "",
    f.dividendYield != null && f.dividendYield > 0
      ? `Temettü Verimi ${pct(f.dividendYield)}`
      : "Temettü dağıtımı yok veya veri eksik"
  );

  const rawScore = n > 0 ? sum / n : null;
  const score = rawScore != null ? Math.round(rawScore * 100) / 100 : null;
  const signal: Signal = score == null ? "TUT" : score >= 0.28 ? "AL" : score <= -0.28 ? "SAT" : "TUT";

  return { score, signal, metrics };
}

export function finalSignal(tech: number, fund: number | null) {
  const raw = fund == null ? tech : 0.6 * tech + 0.4 * fund;
  const score = Math.round(raw * 100) / 100;
  const signal: Signal = score >= 0.3 ? "AL" : score <= -0.3 ? "SAT" : "TUT";
  return { score, signal } as const;
}

export function getHybridAssessment(
  techSignal: Signal,
  fundSignal: Signal | null,
  techScore: number,
  fundScore: number | null
) {
  const hasFund = fundScore != null && fundSignal != null;
  const techWeight = hasFund ? 0.6 : 1.0;
  const fundWeight = hasFund ? 0.4 : 0.0;

  if (!hasFund) {
    return {
      label: "Yalnızca Teknik Analiz Kararı",
      description: "Temel bilanço verisi bulunmadığı için nihai karar %100 teknik göstergelere dayalıdır.",
      techWeight: 1.0,
      fundWeight: 0.0,
      alignment: "neutral" as const,
    };
  }

  if (techSignal === "AL" && fundSignal === "AL") {
    return {
      label: "Güçlü Uyum (Teknik & Temel AL)",
      description: "Hem teknik indikatörler yukarı yönlü momentum üretiyor hem de şirket çarpanları ve kârlılığı güçlü alım bölgesinde.",
      techWeight,
      fundWeight,
      alignment: "strong" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "SAT") {
    return {
      label: "Güçlü Uyum (Teknik & Temel SAT)",
      description: "Hem teknik grafikler düşüş trendinde hem de şirket bilanço rasyoları negatif baskı yaratıyor.",
      techWeight,
      fundWeight,
      alignment: "strong" as const,
    };
  }

  if (techSignal === "AL" && fundSignal === "TUT") {
    return {
      label: "Teknik Destekli Alım (Temel Dengeli)",
      description: "Teknik momentum ve kırılımlar güçlü AL üretirken şirket temel rasyoları makul ve dengeli seyrediyor.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "TUT" && fundSignal === "AL") {
    return {
      label: "Temel Değer Fırsatı (Teknik Beklemede)",
      description: "Şirketin finansalları ve kârlılığı çok cazip ancak fiyatta henüz güçlü bir teknik hareket başlamamış.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "TUT") {
    return {
      label: "Teknik Düzeltme Baskısı (Temel Nötr)",
      description: "Kısa/orta vadeli teknik göstergeler aşırı alım ya da satış baskısı işaret ediyor; temel yapı nötr.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "TUT" && fundSignal === "SAT") {
    return {
      label: "Temel Zayıflık Uyarısı (Teknik Kararsız)",
      description: "Hisse çarpanları pahalı veya borçluluk yüksek; teknik yön yatay olsa da temkinli olunmalı.",
      techWeight,
      fundWeight,
      alignment: "moderate" as const,
    };
  }

  if (techSignal === "AL" && fundSignal === "SAT") {
    return {
      label: "Ayrışan Sinyal (Teknik AL, Temel Zayıf)",
      description: "Teknik olarak yukarı tepki/momentumu var ancak temel rasyolar pahalılık gösteriyor. Yakın stop-loss ile takip önerilir.",
      techWeight,
      fundWeight,
      alignment: "divergent" as const,
    };
  }

  if (techSignal === "SAT" && fundSignal === "AL") {
    return {
      label: "Ayrışan Sinyal (Teknik SAT, Temel Ucuz)",
      description: "Şirket temel olarak çok ucuz ve kârlı olsa da fiyatta teknik satış baskısı sürüyor. Kademeli alım veya dönüş teyidi beklenebilir.",
      techWeight,
      fundWeight,
      alignment: "divergent" as const,
    };
  }

  return {
    label: "Nötr / Dengeli Görünüm",
    description: "Teknik ve temel göstergeler belirgin bir yön kırılımı üretmiyor; bekle-gör stratejisi önerilir.",
    techWeight,
    fundWeight,
    alignment: "neutral" as const,
  };
}

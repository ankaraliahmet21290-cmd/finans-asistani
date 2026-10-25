import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Teknik & Temel Analiz Detay Kılavuzu · Finans Asistanı",
  description:
    "Takip listesi ve sistemdeki tüm hisseler için AL/SAT/TUT karar destek skorlarının teknik indikatörler, temel bilanço rasyoları ve periyot ağırlıklarıyla adım adım hesaplanma mantığı.",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7 shadow-sm"
    >
      <h2 className="mb-4 bg-gradient-to-r from-sky-400 via-indigo-300 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}


function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 my-2">
      <table className="w-full min-w-[560px] text-left text-xs sm:text-sm">
        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3.5 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
              {r.map((c, j) => (
                <td key={j} className="px-3.5 py-2.5 align-middle">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteBox({ children, type = "info" }: { children: ReactNode; type?: "info" | "formula" | "warn" }) {
  const styles = {
    info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    formula: "border-indigo-500/40 bg-indigo-950/40 text-indigo-200 font-mono text-xs sm:text-sm p-4",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  }[type];

  return <div className={`rounded-xl border px-4 py-3 text-xs sm:text-sm ${styles}`}>{children}</div>;
}

export default function TeknikDetayKilavuzuPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <header className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            📊 Karar Destek Algoritması
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
            Teknik & Temel Analiz Sentezi
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Takip Listesi & Sinyal Hesaplama Teknik Detay Kılavuzu
        </h1>
        <p className="mt-2.5 text-sm text-zinc-400 sm:text-base leading-relaxed">
          Takip listesindeki ve lider sinyallerdeki <strong className="text-emerald-400">AL</strong>,{" "}
          <strong className="text-amber-400">TUT</strong>, <strong className="text-red-400">SAT</strong> sinyalleri tek bir indikatöre dayanmaz. 
          Fiyat mumlarından çıkarılan 9 teknik indikatör, şirketin finansal bilançosu ve seçilen periyodun ağırlık katsayıları birleştirilerek matematiksel bir skor üretilir.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            ← Ana Ekrana Dön
          </Link>
          <Link
            href="/kullanim-kilavuzu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-300 transition hover:bg-sky-500/20"
          >
            📖 Genel Kullanım Kılavuzu
          </Link>
        </div>
      </header>

      {/* 1. Nihai Karar Eşikleri */}
      <Section id="nihai-karar" title="1. Nihai Karar Eşikleri (Karma Skor: -1.00 ile +1.00)">
        <p>
          Hesaplanan nihai ağırlıklı puan (Karma Skor), <strong>-1.00 (en güçlü negatif)</strong> ile <strong>+1.00 (en güçlü pozitif)</strong> arasında standardize edilir.
          Ekranda gördüğünüz etiket şu matematiksel eşiklere göre belirlenir:
        </p>

        <Table
          head={["Sinyal Etiketi", "Karma Skor Eşiği", "Piyasa Anlamı & Karar"]}
          rows={[
            [
              <span key="al" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🟢 AL
              </span>,
              <code key="s1" className="text-emerald-300 font-mono font-bold">Skor ≥ +0.28</code>,
              "Teknik momentum ve bilanço verileri yukarı yönlü hareketi teyit ediyor. Alım iştahı güçlü.",
            ],
            [
              <span key="tut" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🟡 TUT
              </span>,
              <code key="s2" className="text-amber-300 font-mono font-bold">-0.28 &lt; Skor &lt; +0.28</code>,
              "Belirgin bir trend veya rasyo avantajı yok. Konsolidasyon, yatay piyasa veya bekle-gör bölgesi.",
            ],
            [
              <span key="sat" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                🔴 SAT
              </span>,
              <code key="s3" className="text-red-300 font-mono font-bold">Skor ≤ -0.28</code>,
              "Teknik göstergeler aşırı satış/düşüş trendi baskısı veriyor veya şirket çarpanları aşırı primli/zararda.",
            ],
          ]}
        />

        <NoteBox type="info">
          💡 <strong>Altın ve Emtia Kuralı:</strong> Ons Altın (GC=F) gibi makro enstrümanların şirket bilançosu bulunmadığından temel analiz skoru üretilmez ve nihai sinyal <strong>%100 Teknik Analiz</strong> ile hesaplanır.
        </NoteBox>
      </Section>

      {/* 2. Periyoda Göre Ağırlık Dağılımı */}
      <Section id="periyot-agirligi" title="2. Periyoda Göre Teknik ve Temel Analiz Ağırlıkları">
        <p>
          Kısa periyotlarda hisse fiyatını bilanço kalemleri değil, anlık likidite ve osilatörler belirler. 
          Vade uzadıkça şirketin net kârı, borçluluğu ve özkaynak büyümesi fiyata yön verir. 
          Bu nedenle sistem dinamik ağırlıklandırma kullanır:
        </p>

        <Table
          head={["Seçilen Zaman Dilimi", "Teknik Ağırlık", "Temel Ağırlık", "Stratejik Amaç & Vade"]}
          rows={[
            ["5 Dakikalık (5m)", "%95", "%5", "Çok hızlı gün içi scalping ve anlık kırılımlar"],
            ["10 Dakikalık (10m)", "%95", "%5", "Hızlı seans içi momentum takibi"],
            ["15 Dakikalık (15m)", "%90", "%10", "Standart gün içi seans dalgalanmaları"],
            ["30 Dakikalık (30m)", "%90", "%10", "Dengeli gün içi yön ve destek/direnç"],
            ["1 Saatlik (1h)", "%80", "%20", "Gün içi ile 1-3 günlük kısa swing geçişi"],
            ["2 Saatlik (2h)", "%80", "%20", "Kısa-orta vadeli seans içi trendler"],
            ["4 Saatlik (4h)", "%70", "%30", "Swing ticaret için en dengeli ara periyot"],
            [
              <strong key="d" className="text-sky-300">Günlük (1d - Standart)</strong>,
              <strong key="dw1" className="text-sky-300">%60</strong>,
              <strong key="dw2" className="text-sky-300">%40</strong>,
              "Yatırımcılar için en güvenilir 1-6 haftalık ana trend yönü",
            ],
            ["Haftalık (1wk)", "%45", "%55", "1-6 aylık orta-uzun vadeli portföy taşımacılığı"],
            ["Aylık (1mo)", "%35", "%65", "6 ay - 3 yıl makro Warren Buffett değer yatırımı"],
          ]}
        />

        <NoteBox type="formula">
          Karma Skor = (Teknik Skor × Teknik Ağırlık) + (Temel Skor × Temel Ağırlık)
        </NoteBox>
      </Section>

      {/* 3. Teknik Analiz Skoru */}
      <Section id="teknik-analiz" title="3. Teknik Analiz Skoru Nasıl Hesaplanır? (4 Kategori & 9 İndikatör)">
        <p>
          Seçilen periyottaki mum grafiği (Açılış, Yüksek, Düşük, Kapanış ve Hacim) matematiksel indikatörlere dönüştürülür. 
          Her kategori kendi içinde ağırlıklı ortalamaya tabi tutulur:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Kategori 1 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-100">1. Ana Trend & Ortalamalar</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Ağırlık: %35
              </span>
            </div>
            <ul className="text-xs space-y-2 text-zinc-300">
              <li>
                <strong>Fiyat / SMA 200 (Ağırlık: 1.2):</strong> Fiyat &gt; SMA 200 ise uzun vadeli boğa rejimi (+1), Fiyat &lt; SMA 200 ise ayı rejimi (-1).
              </li>
              <li>
                <strong>EMA 20 / EMA 50 (Ağırlık: 1.0):</strong> Hızlı Golden Cross (+1), Death Cross (-1), Fiyat &gt; EMA20 &gt; EMA50 güçlü boğa dizilimi (+1).
              </li>
              <li>
                <strong>SMA 50 / SMA 200 (Ağırlık: 0.8):</strong> Ana döngü kesişimi. SMA 50 &gt; SMA 200 ise yapısal yükseliş trendi.
              </li>
            </ul>
          </div>

          {/* Kategori 2 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-100">2. Trend Gücü & Piyasa Rejimi</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ağırlık: %25
              </span>
            </div>
            <ul className="text-xs space-y-2 text-zinc-300">
              <li>
                <strong>ADX(14) ≥ 25 & +DI &gt; -DI:</strong> Güçlü boğa trend rejimi (+1 puan).
              </li>
              <li>
                <strong>ADX(14) ≥ 25 & -DI &gt; +DI:</strong> Güçlü ayı trend rejimi (-1 puan).
              </li>
              <li>
                <strong>ADX(14) &lt; 20 (Testere Piyasası):</strong> Trend göstergeleri nötrlenir (0 puan), osilatörlere ve desteğe öncelik verilir.
              </li>
              <li>
                <strong>ADX 20-25 Arası:</strong> Gelişmekte olan ılımlı trend (±0.5 puan).
              </li>
            </ul>
          </div>

          {/* Kategori 3 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-100">3. Momentum & Zamanlama</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ağırlık: %25
              </span>
            </div>
            <ul className="text-xs space-y-2 text-zinc-300">
              <li>
                <strong>MACD(12,26,9) (Ağırlık: 1.0):</strong> Sinyal çizgisini yukarı kesiş (+1), aşağı kesiş (-1).
              </li>
              <li>
                <strong>RSI(14) (Ağırlık: 0.9):</strong> RSI &lt; 30 aşırı satım (+1). Eğer ADX güçlü boğa teyit ediyorsa RSI &gt; 70 bir satış değil, <em>kuvvetli momentum koşusu</em> olarak pozitif puanlanır.
              </li>
              <li>
                <strong>Stokastik(14,3,3) (Ağırlık: 0.8):</strong> Dipte (%K&lt;30) %D&apos;yi yukarı kesiş (+1 dip teyidi), tepede %D&apos;yi aşağı kesiş (-1).
              </li>
            </ul>
          </div>

          {/* Kategori 4 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-100">4. Hacim & Volatilite Teyidi</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Ağırlık: %15
              </span>
            </div>
            <ul className="text-xs space-y-2 text-zinc-300">
              <li>
                <strong>Hacim Teyidi (20G Hacim Ort.):</strong> İşlem hacmi ortalamanın ≥ 1.3 katı ve fiyat artıyorsa hacimli alım (+1); hacimli düşüyorsa (-1).
              </li>
              <li>
                <strong>Bollinger Bantları(20,2):</strong> Fiyat alt bandın altında aşırı satım (+1), üst bandın üstünde kâr satışı (-1). Bant içine dönüş teyitleri puanlanır.
              </li>
              <li>
                <strong>Düşük Hacim:</strong> Ortalamanın %70&apos;inin altında ise güven puanı düşürülür.
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 4. Temel Analiz Skoru */}
      <Section id="temel-analiz" title="4. Temel Analiz Skoru Nasıl Hesaplanır? (Sanayi vs. Bankacılık Modeli)">
        <p>
          Borsa İstanbul şirketlerinin bilanço ve gelir tabloları değerlendirilirken sanayi şirketleri ile bankalar <strong>aynı formülle değerlendirilemez</strong>. 
          Çünkü bankalarda mevduatlar yasal olarak bilanço borcu sayılır; Cari Oran veya Borç/Özkaynak rasyosu bankacılıkta anlamsızdır.
        </p>

        <Table
          head={["Bilanço Kategorisi", "Sanayi Ağırlığı", "Banka Ağırlığı", "Kriter & Eşik Değerler"]}
          rows={[
            [
              <strong key="cat1">Kârlılık & Verimlilik</strong>,
              "%35",
              "%45 (En Yüksek)",
              <span key="desc1">
                • <strong>Net Marj:</strong> &gt;%10 (+1), ≤0 (-1)<br />
                • <strong>Faaliyet Marjı:</strong> &gt;%15 (+1), ≤0 (-1)<br />
                • <strong>ROE:</strong> Sanayide &gt;%15 (+1), Bankada &gt;%20 (+1 Warren Buffett kriteri)<br />
                • <strong>ROA:</strong> Sanayide &gt;%5 (+1), Bankada &gt;%1.8 (+1 varlık verimliliği)
              </span>,
            ],
            [
              <strong key="cat2">Değerleme & Çarpanlar</strong>,
              "%30",
              "%40",
              <span key="desc2">
                • <strong>PEG Oranı (Peter Lynch):</strong> 0 &lt; PEG ≤ 1.0 cazip (+1), &gt; 2.0 pahalı (-1)<br />
                • <strong>F/K (Fiyat/Kazanç):</strong> Sanayide &lt; 15 (+1), Bankalarda &lt; 7 (+1 ucuz çarpan)<br />
                • <strong>PD/DD (Piyasa/Defter):</strong> Sanayide &lt; 1.5 (+1), Bankalarda &lt; 0.9 (+1 iskontolu)
              </span>,
            ],
            [
              <strong key="cat3">Mali Sağlamlık & Borç</strong>,
              "%25",
              "%0 (Devre Dışı)",
              <span key="desc3">
                • <strong>Cari Oran (Likidite):</strong> ≥ 1.2 (+1 borç ödeme güçlü), &lt; 1.0 (-1 risk)<br />
                • <strong>Borç / Özkaynak:</strong> &lt; %100 (+1 düşük risk), &gt; %200 (-1 yüksek borçlanma)<br />
                <em>(Bankacılık sektöründe mevduat kaldıracı nedeniyle 0 ağırlıktadır.)</em>
              </span>,
            ],
            [
              <strong key="cat4">Büyüme & Temettü</strong>,
              "%10",
              "%15",
              <span key="desc4">
                • <strong>Gelir Büyümesi:</strong> Yıllık ciro artışı &gt; %10 (+1), negatif ise (-1)<br />
                • <strong>Temettü Verimi:</strong> Nakit kâr payı verimi &gt; %2 (+1 ilave getiri)
              </span>,
            ],
          ]}
        />
      </Section>

      {/* 5. ATR Dinamik Risk Masası */}
      <Section id="atr-modeli" title="5. Dinamik Risk: ATR Bazlı Stop-Loss & Kâr Al Modeli">
        <p>
          Her hissenin oynaklığı (volatilitesi) farklıdır. Sistemin ürettiği Stop-Loss ve Kâr Al seviyeleri sabit bir yüzdeyle değil, 
          hissenin son 14 periyottaki <strong>ATR (Average True Range - Ortalama Gerçek Aralık)</strong> değerine göre hesaplanır:
        </p>

        <div className="grid gap-3 sm:grid-cols-3 my-2">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-center">
            <span className="text-xs font-semibold text-red-300 block mb-1">Dinamik Stop-Loss</span>
            <span className="text-base font-bold text-red-400 font-mono">Fiyat - (1.5 × ATR)</span>
            <p className="text-[11px] text-zinc-400 mt-1">Olağan piyasa gürültüsünde stop olmamak için 1.5x oynaklık tamponu</p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
            <span className="text-xs font-semibold text-emerald-300 block mb-1">Dinamik Kâr Al (Hedef)</span>
            <span className="text-base font-bold text-emerald-400 font-mono">Fiyat + (2.5 × ATR)</span>
            <p className="text-[11px] text-zinc-400 mt-1">Trend dalgasının hedeflenen potansiyel kâr alma seviyesi</p>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-center">
            <span className="text-xs font-semibold text-indigo-300 block mb-1">Önerilen Risk/Kazanç</span>
            <span className="text-base font-bold text-indigo-400 font-mono">1 : 1.67 (R:R)</span>
            <p className="text-[11px] text-zinc-400 mt-1">1 birim risk karşılığında 1.67 birim kazanç hedefi</p>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          Bu değerler <strong>Aktif Pozisyon Takibi</strong> masasında pozisyon açarken otomatik olarak doldurulabilir veya dilerseniz kendi seviyenizi girebilirsiniz.
        </p>
      </Section>

      {/* 6. Uyum ve Ayrışma */}
      <Section id="sinyal-uyumu" title="6. Hibrit Değerlendirme: Sinyal Uyumu ve Ayrışma Senaryoları">
        <p>Hisse detay ekranında teknik ve temel sinyalin birbirine göre konumu ayrıca etiketlenir:</p>
        <Table
          head={["Teknik Sinyal", "Temel Sinyal", "Görünüm Etiketi", "Nasıl Yorumlanmalı?"]}
          rows={[
            [
              <span key="a1" className="text-emerald-400 font-bold">AL</span>,
              <span key="a2" className="text-emerald-400 font-bold">AL</span>,
              <span key="g1" className="text-emerald-400 font-semibold">Güçlü Uyum</span>,
              "En ideal senaryo. Hem grafikler yükseliş momentumunda hem de şirket çarpanları ucuz ve kârlı.",
            ],
            [
              <span key="s1" className="text-red-400 font-bold">SAT</span>,
              <span key="s2" className="text-red-400 font-bold">SAT</span>,
              <span key="g2" className="text-red-400 font-semibold">Güçlü Ayı Uyumu</span>,
              "Uzak durulması gereken bölge. Hem teknik düşüş trendinde hem de bilançoda bozulma/aşırı pahalılık var.",
            ],
            [
              <span key="d1" className="text-emerald-400 font-bold">AL</span>,
              <span key="d2" className="text-red-400 font-bold">SAT</span>,
              <span key="g3" className="text-amber-400 font-semibold">Ayrışan Sinyal (Teknik AL, Temel Zayıf)</span>,
              "Kısa vadeli spekülatif tepki veya ralli var ancak şirketin temeli pahalı. Yakın Stop-Loss ile takip edilmeli.",
            ],
            [
              <span key="d3" className="text-red-400 font-bold">SAT</span>,
              <span key="d4" className="text-emerald-400 font-bold">AL</span>,
              <span key="g4" className="text-sky-400 font-semibold">Ayrışan Sinyal (Teknik SAT, Temel Ucuz)</span>,
              "Şirket temel olarak çok ucuz ve kârlı ancak fiyatta satış baskısı sürüyor. Dönüş teyidi beklenmeli ya da kademeli alım düşünülmeli.",
            ],
          ]}
        />
      </Section>

      {/* 7. Otomasyon & Zamanlayıcı Mimarisi */}
      <Section id="otomasyon-scheduler" title="7. Otomasyon & Zamanlayıcı Mimarisi (Scheduler & Senkronizasyon)">
        <p>
          Finans Asistanı, arka planda bağımsız bir zamanlayıcı motoru (<code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-sky-300 font-mono">lib/scheduler.ts</code>) 
          çalıştırır. Bu motor, sistem kaynaklarını (CPU, API kotası ve bellek) korurken her alıcıya kişiselleştirilmiş 
          analiz teslimatı sağlamak üzere tasarlanmıştır.
        </p>

        {/* 7.1 Tick Döngüsü */}
        <h3 className="text-base font-bold text-zinc-100 mt-2">7.1. 30 Saniyelik Asenkron Tick Döngüsü</h3>
        <p className="text-xs text-zinc-300">
          Sunucu ilk başladığında arka planda her 30 saniyede bir tetiklenen hafif bir kontrol döngüsü başlatılır:
        </p>
        <div className="grid gap-3 sm:grid-cols-3 my-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <span className="text-xs font-bold text-sky-400 block mb-1">1. checkSchedulerTick()</span>
            <p className="text-[11px] text-zinc-400">Piyasa bazlı bülten tarama sürelerini ve alıcıların mail periyotlarını denetler.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <span className="text-xs font-bold text-rose-400 block mb-1">2. checkPositionTrackerTick()</span>
            <p className="text-[11px] text-zinc-400">Açık pozisyonların fiyatlarını sorgular; Stop-Loss veya Kâr Al tetiklendiğinde anında acil alarm üretir.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <span className="text-xs font-bold text-violet-400 block mb-1">3. checkWatchlistTrackerTick()</span>
            <p className="text-[11px] text-zinc-400">İzleme listesindeki hisselerin önceki sinyalleriyle güncel sinyallerini kıyaslar (State-Diff).</p>
          </div>
        </div>

        {/* 7.2 Piyasa vs Alıcı Algoritması */}
        <h3 className="text-base font-bold text-zinc-100 mt-3">7.2. Piyasa Tarama Motoru vs. Alıcı Dağıtım Filtresi Algoritması</h3>
        <p className="text-xs text-zinc-300">
          Scheduler, e-posta gönderirken iki aşamalı bir matematiksel kontrol uygular:
        </p>

        <NoteBox type="formula">
{`// 1. AŞAMA: Piyasa Tarama Motoru Kontrolü
if (now - lastMarketScan < marketIntervalMs) {
    skip(); // Bu piyasa için henüz tarama vakti gelmedi, API çağrısı yapma!
}

// 2. AŞAMA: Alıcı Bazlı Dağıtım Filtresi
effectiveInterval = recipient.intervalKey || marketIntervalKey || globalIntervalKey;
if (effectiveInterval === "daily") {
    isDue = (lastDateIstanbul !== todayIstanbul);
} else {
    isDue = (now - recipientLastMailedTime >= recipientIntervalMs);
}
if (isDue) {
    dueRecipients.push(recipient); // Yalnızca süresi dolan alıcıya mail hazırla
}`}
        </NoteBox>

        <ul className="text-xs space-y-1.5 text-zinc-300 list-disc pl-5 my-2">
          <li>
            <strong>Piyasa Seans Koruması:</strong> Kripto piyasası 7/24 taranırken; BIST ve ABD piyasaları 
            <code className="text-sky-300 font-mono"> onlyTradingHours </code> aktifse yalnızca resmi seans saatlerinde taranır.
          </li>
          <li>
            <strong>Kaynak Koruma Garantisi:</strong> Bülten tarama sıklığı 15 dakika ise, sistem saatte yalnızca 4 kez ağır sinyal taraması yapar. 
            Alıcıların 1 saatlik veya günlük tercihleri bu taramaların içinden filtrelenerek servis edilir.
          </li>
        </ul>

        {/* 7.3 Çift Yönlü Senkronizasyon */}
        <h3 className="text-base font-bold text-zinc-100 mt-3">7.3. Çift Yönlü Senkronizasyon & Tek Gerçeklik Kaynağı (Single Source of Truth)</h3>
        <p className="text-xs text-zinc-300">
          Uygulama arayüzünde (Genel Ayarlar masası ile canlı piyasa ekranları) dağınık veya birbiriyle çelişen veri bulunmaz. 
          Tüm yapılandırmalar proje kökündeki standart Markdown dosyalarında tutulur:
        </p>

        <Table
          head={["Ayar Grubu", "Depolama Dosyası", "İlgili REST API", "Senkronize Bileşenler"]}
          rows={[
            [
              <strong key="a1" className="text-sky-300">Bülten Tarama Sıklığı</strong>,
              "mail-settings.md",
              "/api/mail/settings",
              "Genel Ayarlar ↔ Çoklu Zaman Dilimi MailScheduleControl",
            ],
            [
              <strong key="a2" className="text-amber-300">Canlı Veri Yenileme</strong>,
              "refresh-settings.md",
              "/api/settings/refresh",
              "Genel Ayarlar ↔ Ekran Geri Sayım Sayacı (AutoRefreshControl)",
            ],
            [
              <strong key="a3" className="text-emerald-300">Varsayılan Endeks Kapsamı</strong>,
              "endeks-tip.md",
              "/api/index-type/settings",
              "Genel Ayarlar ↔ BIST 30 / BIST 100 Butonları",
            ],
            [
              <strong key="a4" className="text-rose-300">Portföy Masası Sıklığı</strong>,
              "portfoy-takip.md",
              "/api/positions/settings",
              "Genel Ayarlar ↔ Pozisyon Masası Tarama Seçicisi",
            ],
            [
              <strong key="a5" className="text-violet-300">İzleme Listesi Sıklığı</strong>,
              "watchlist.md",
              "/api/watchlist/settings",
              "Genel Ayarlar ↔ Takip Listesi Zamanlayıcı Butonu",
            ],
          ]}
        />
        <p className="text-xs text-zinc-400">
          Kullanıcı arayüzde bir ayarı değiştirdiğinde, sunucu dosyayı günceller ve tarayıcı içi 
          <code className="text-sky-300 font-mono"> CustomEvent </code> tetikleyerek açık olan tüm sekmelerin 
          sayfayı yenilemeye gerek kalmadan anında yeni duruma geçmesini sağlar.
        </p>
      </Section>

      {/* Footer navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-xs text-zinc-400">
        <div>
          <span>Bu kılavuz sistemin matematiksel formüllerini, kural setlerini ve otomasyon mimarisini özetler.</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Yatırım kararlarınızı sadece tek bir göstergeye veya araca bağlamayınız.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white transition hover:bg-sky-500"
          >
            Ana Sayfaya Git
          </Link>
          <Link
            href="/kullanim-kilavuzu"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            Kullanım Kılavuzu
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kullanım Kılavuzu · Finans Asistanı",
  description:
    "Finans Asistanı ekran bölümleri, çoklu piyasalar (BIST, Kripto, Emtia, ABD Borsası), genel ayarlar, e-posta gönderim sıklığı, ekran yenileme ve analiz puanlama mantığının ayrıntılı kullanım kılavuzu.",
};

const TOC = [
  { id: "genel", label: "1. Genel Bakış & Çoklu Piyasa Desteği" },
  { id: "navigasyon", label: "2. Ekran Bölümleri & Navigasyon Mimarisi" },
  { id: "bist-degerleme", label: "3. BIST Sektörleri, Değerleme Tablosu & Analist Konsensüsü" },
  { id: "genel-ayarlar", label: "4. Genel Ayarlar & Çift Yönlü Senkronizasyon (/ayarlar)" },
  { id: "ekran-yenileme", label: "5. Ekran Yenileme & Akıllı Önbellek (10 Panel Frekansı)" },
  { id: "mail-sistemi", label: "6. E-Posta Gönderim Sıklığı & Bildirim Dağıtımı" },
  { id: "portfoy-tarama", label: "7. Portföy Takibi & Portföy Tarama Sıklığı" },
  { id: "izleme-listesi", label: "8. İzleme Listesi & Sinyal Değişim Kontrolü" },
  { id: "puanlama", label: "9. Hisseler, Hedef Fiyatlar ve Çarpanlar Neye Göre Belirlenir?" },
  { id: "teknik", label: "10. Teknik Analiz Metodolojisi (9 Gösterge)" },
  { id: "temel", label: "11. Temel Analiz Metodolojisi (Sanayi & Banka)" },
  { id: "karma", label: "12. Karma Karar & Periyot Stratejileri" },
  { id: "ipuclari", label: "13. Seans Saatleri, İpuçları & Güvenlik Uyarıları" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7 shadow-sm transition hover:border-zinc-700/80"
    >
      <h2 className="mb-4 bg-gradient-to-r from-sky-400 via-indigo-300 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 text-base font-bold text-zinc-100 flex items-center gap-2">{children}</h3>;
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

function Note({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "success" | "purple";
}) {
  const cls = {
    info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    purple: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  }[tone];

  return <div className={`rounded-xl border px-4 py-3 text-xs sm:text-sm ${cls}`}>{children}</div>;
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 font-semibold">
    {children}
  </code>
);

export default function KullanimKilavuzuPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-2 sm:px-4 py-4">
      {/* Top Header */}
      <header className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
            📖 Kapsamlı Kullanım Kılavuzu
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            Sürüm 2.4 · 2026 Güncellemesi
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Finans Asistanı Kullanım ve Operasyon Kılavuzu
        </h1>
        <p className="mt-2.5 max-w-4xl text-sm text-zinc-400 sm:text-base leading-relaxed">
          Finans Asistanı; Borsa İstanbul (BIST), Kripto Paralar, Emtia &amp; Döviz ve ABD Borsası için
          geliştirilmiş yapay zeka ve kural tabanlı bir <strong>Karar Destek Terminalidir</strong>.
          Ekran bölümleri, <strong>Genel Ayarlar Masası</strong>, <strong>Mail Gönderim Sıklığı</strong>,{" "}
          <strong>Ekran Yenileme &amp; Cache</strong> mimarisi, <strong>Portföy Tarama Sıklığı</strong> ve
          sinyal algoritmaları bu dokümanda eksiksiz açıklanmıştır.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
          >
            ← Ana Ekrana Dön
          </Link>
          <Link
            href="/ayarlar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/30 hover:border-sky-400"
          >
            ⚙️ Genel Ayarlar Masasını Aç
          </Link>
          <Link
            href="/teknik-detay-klavuzu"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/30"
          >
            📊 Matematiksel Teknik Detaylar
          </Link>
        </div>
      </header>

      {/* Table of Contents */}
      <nav
        aria-label="İçindekiler"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-3 border-b border-zinc-800/60 pb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span>📑</span> İçindekiler Tablosu (Hızlı Atlama)
          </p>
          <span className="text-[11px] text-zinc-500">12 Bölüm</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="group flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-sky-500/40 hover:bg-zinc-800/80 hover:text-sky-300"
              >
                <span className="text-sky-400/70 group-hover:text-sky-300 font-mono">›</span>
                <span className="truncate">{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ========================================================================= */}
      {/* 1. GENEL BAKIŞ & ÇOKLU PİYASA DESTEĞİ */}
      {/* ========================================================================= */}
      <Section id="genel" title="1. Genel Bakış & Çoklu Piyasa Desteği">
        <p>
          Finans Asistanı, finansal piyasalardaki gürültüyü filtreleyerek yatırımcılara disiplinli ve matematiksel
          bir karar destek zemini sunar. Uygulama dört ana piyasada analiz ve tarama desteği vermektedir:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 mb-1">
                <span className="text-lg">🇹🇷</span> Borsa İstanbul (BIST)
              </div>
              <p className="text-xs text-zinc-400">
                BIST 30, BIST 100 ve 800+ BIST şirketinin teknik mum grafiği ve bilanço rasyoları analiz edilir.
              </p>
            </div>
            <Link href="/" className="mt-3 text-[11px] font-semibold text-sky-400 hover:underline">
              BIST Terminali →
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 mb-1">
                <span className="text-lg">🪙</span> Kripto Para Piyasası
              </div>
              <p className="text-xs text-zinc-400">
                BTC, ETH, SOL ve 9 farklı kategorideki 100+ popüler coin 7/24 kesintisiz taranır.
              </p>
            </div>
            <Link href="/kripto" className="mt-3 text-[11px] font-semibold text-amber-400 hover:underline">
              Kripto Terminali →
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 mb-1">
                <span className="text-lg">🥇</span> Emtia &amp; Döviz
              </div>
              <p className="text-xs text-zinc-400">
                Ons Altın, Gram Altın, Gümüş, Brent Petrol, Doğalgaz, Bakır, USD/TRY, EUR/TRY ve DXY endeksi.
              </p>
            </div>
            <Link href="/emtia-doviz" className="mt-3 text-[11px] font-semibold text-emerald-400 hover:underline">
              Emtia &amp; FX Terminali →
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100 mb-1">
                <span className="text-lg">🇺🇸</span> ABD Borsası
              </div>
              <p className="text-xs text-zinc-400">
                Apple, Microsoft, NVIDIA, Tesla, Google, Amazon gibi Nasdaq ve S&amp;P 500 devleri.
              </p>
            </div>
            <Link href="/abd-borsasi" className="mt-3 text-[11px] font-semibold text-indigo-400 hover:underline">
              ABD Borsası Terminali →
            </Link>
          </div>
        </div>

        <H3>Karar Destek Sinyallerinin Anlamı</H3>
        <p>
          Her varlık için hesaplanan karma skor <strong>-1,00 ile +1,00</strong> aralığında normalize edilir:
        </p>
        <Table
          head={["Sinyal", "Karma Skor Eşiği", "Piyasa Anlamı & Aksiyon Önerisi"]}
          rows={[
            [
              <span key="a" className="inline-flex items-center gap-1 font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> AL (Güçlü Pozitif)
              </span>,
              <C key="ae">Karma Skor ≥ +0,28</C>,
              "Göstergeler ve trend boğa bölgesindedir; alım koşulları teknik/temel olarak olgunlaşmıştır.",
            ],
            [
              <span key="t" className="inline-flex items-center gap-1 font-bold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> TUT (Nötr / Bekle-Gör)
              </span>,
              <C key="te">-0,28 &lt; Karma Skor &lt; +0,28</C>,
              "Yön belirgin değildir, piyasa yatay bantta veya dinlenmededir. Mevcut pozisyon korunabilir, yeni giriş için teyit beklenir.",
            ],
            [
              <span key="s" className="inline-flex items-center gap-1 font-bold text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" /> SAT (Güçlü Negatif)
              </span>,
              <C key="se">Karma Skor ≤ -0,28</C>,
              "Ayı piyasası baskısı, trend kaybı veya zayıf rasyolar mevcuttur; kâr realizasyonu veya nakde geçiş düşünülmelidir.",
            ],
          ]}
        />

        <Note tone="warn">
          <strong>Yasal Uyarı:</strong> Finans Asistanı algoritmik bir analiz ve karar destek platformudur;
          <strong>yatırım tavsiyesi (YTD) niteliğinde değildir</strong>. Piyasa riskleri, ani haber akışları ve
          gecikmeli borsa verileri nedeniyle yatırım kararlarınızı kendi araştırmanıza dayandırmalısınız.
        </Note>
      </Section>

      {/* ========================================================================= */}
      {/* 2. EKRAN BÖLÜMLERİ & NAVİGASYON */}
      {/* ========================================================================= */}
      <Section id="navigasyon" title="2. Ekran Bölümleri & Navigasyon Mimarisi">
        <p>
          Finans Asistanı, hem masaüstü hem de mobil cihazlarda en ergonomik deneyimi sunmak üzere modüler
          bir mimari ile tasarlanmıştır. Sayfalar ve üst menü bölümleri aşağıda listelenmiştir:
        </p>

        <H3>Üst Navigasyon Çubuğu (AppHeader &amp; MobileNavigation)</H3>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Logo &amp; Ana Sayfa Linki:</strong> Hangi sayfada olursanız olun tek tıkla BIST ana ekranına döner.
          </li>
          <li>
            <strong>Evrensel Varlık Arama Kutusu (⌘K):</strong> Tüm hisseler, kripto paralar ve emtialar arasında
            kod veya isimle anında arama yapıp detay grafiğine gitmenizi sağlar.
          </li>
          <li>
            <strong>Piyasa Sekmeleri Çubuğu:</strong> BIST (🇹🇷), Emtia &amp; Döviz (🥇), Kripto Para (🪙) ve ABD
            Borsası (🇺🇸) arasında hızlı geçiş sağlar.
          </li>
          <li>
            <strong>Canlı Seans Rozeti:</strong> BIST için 09:50 - 18:00 saatlerini, ABD için 16:30 - 23:00 saatlerini,
            Kripto için 7/24 kesintisiz seans durumunu canlı gösterir.
          </li>
          <li>
            <strong>Üst Menü Bağlantıları:</strong>
            <ul className="list-circle space-y-1 pl-5 mt-1 text-xs text-zinc-300">
              <li>
                <Link href="/kullanim-kilavuzu" className="text-sky-400 hover:underline">
                  📖 Kullanım Kılavuzu:
                </Link>{" "}
                Şu an okuduğunuz genel operasyon ve kullanım rehberi.
              </li>
              <li>
                <Link href="/teknik-detay-klavuzu" className="text-indigo-400 hover:underline">
                  📊 Teknik Detay Kılavuzu:
                </Link>{" "}
                RSI, MACD, ADX, SMA, F/K, PD/DD hesaplama formülleri ve ağırlık tabloları.
              </li>
              <li>
                <Link href="/analitik" className="text-emerald-400 hover:underline">
                  👥 Canlı Analitik &amp; IP Masası:
                </Link>{" "}
                Kullanıcı ziyaretleri, sayfa görüntülemeleri ve tıklama istatistikleri.
              </li>
              <li>
                <Link href="/takip" className="text-violet-400 hover:underline">
                  📌 İzleme Listesi Masası:
                </Link>{" "}
                Favori varlıklarınızın toplu listelendiği müstakil ekran.
              </li>
              <li>
                <Link href="/pozisyonlar" className="text-rose-400 hover:underline">
                  💼 Portföy Masası:
                </Link>{" "}
                Stop-Loss ve Kâr Al seviyeleriyle pozisyon yönetimi ekranı.
              </li>
              <li>
                <Link href="/ayarlar" className="text-sky-300 font-bold hover:underline">
                  ⚙️ Genel Ayarlar Masası:
                </Link>{" "}
                Tüm tarama sıklıkları, e-posta dağıtımı ve önbellek yönetimi.
              </li>
            </ul>
          </li>
        </ul>

        <H3>Ana Ekrandaki Temel Masalar (Bileşenler)</H3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-zinc-200 text-sm mb-1">① Varlık Önizleme &amp; Hızlı Analiz</h4>
            <p className="text-xs text-zinc-400">
              Şirket arama kutusu ve hızlı erişim butonları (THYAO, ASELS, GARAN vb.). Seçilen varlığın anlık
              fiyatı, karma skoru, periyot düğmeleri (5dk - Aylık) ve sinyal gerekçeleri kartta açılır.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-zinc-200 text-sm mb-1">② Çoklu Zaman Dilimi Taraması</h4>
            <p className="text-xs text-zinc-400">
              Seçilen endeksin tüm hisselerini 10 ayrı periyotta (5dk, 10dk, 15dk, 30dk, 1S, 2S, 4S, 1G, 1H, 1A)
              aynı anda tarar; AL ve SAT verenleri puan sırasıyla sekmelerde sunar.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-zinc-200 text-sm mb-1">③ Lider Sinyaller (Top AL &amp; SAT)</h4>
            <p className="text-xs text-zinc-400">
              Piyasadaki en güçlü 5 AL ve en zayıf 5 SAT hissesini öne çıkarır. Her satırda güncel fiyat, günlük
              değişim %, teknik/temel puan dağılımı ve en kritik sinyal sebebi gösterilir.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-zinc-200 text-sm mb-1">④ Sinyal Karşılaştırma &amp; Doğruluk</h4>
            <p className="text-xs text-zinc-400">
              Hisse detayından “Takibe Al” dediğiniz kayıtların, o günkü sinyal ve fiyatıyla bugünkü fiyatını
              kıyaslayarak sistemin geçmiş sinyal isabet oranını şeffaf biçimde ölçer.
            </p>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 md:col-span-2">
            <h4 className="font-bold text-sky-300 text-sm mb-1 flex items-center gap-2">
              <span>🎯</span> ⑤ BIST Analist Konsensüsü &amp; Hedef Fiyat Kartları
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Arama kutusunun hemen altında konumlanan bu özel vitrin paneli, Borsa İstanbul&apos;un dev şirketlerini
              takip eden yerli ve küresel aracı kurumların (İş Yatırım, Garanti BBVA, Ak Yatırım, Yapı Kredi, HSBC vb.)
              12 aylık <strong>konsensüs hedef fiyatlarını</strong> ve cari borsa fiyatına göre <strong>getiri potansiyellerini (%)</strong>
              canlı olarak karşılaştırır.
            </p>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">
                <span className="font-bold text-sky-400">🏆 BIST Liderleri Modu:</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  THYAO, ASELS, GARAN, TUPRS gibi BIST 30&apos;un lokomotif şirketlerinin hedef fiyat, analist tavsiyesi ve canlı AL/SAT sinyallerini sunar.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">
                <span className="font-bold text-emerald-400">🚀 En Yüksek Potansiyel Modu:</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  BIST 30 havuzunda analistlerin belirlediği 12 aylık hedef fiyata göre en yüksek prim potansiyeli sunan ilk 4 şirketi anında öne çıkarır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ========================================================================= */}
      {/* 3. GENEL AYARLAR & BİLDİRİM MASASI (/ayarlar) */}
      {/* ========================================================================= */}
      <Section id="genel-ayarlar" title="3. Genel Ayarlar & Bildirim Dağıtımı Masası (/ayarlar)">
        <p>
          <Link href="/ayarlar" className="font-bold text-sky-400 underline">
            Genel Ayarlar Masası (/ayarlar)
          </Link>
          , Finans Asistanı&apos;nın sinir merkezidir. Eskiden farklı panellere dağılmış olan tüm tarama aralıkları,
          e-posta alıcıları, bildirim türleri, ekran yenileme sıklıkları ve önbellek tercihleri tek bir merkezi
          ekranda toplanmıştır.
        </p>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-300 mb-1">
            <span>⚙️</span> Bu Ekrana Nasıl Ulaşılır?
          </div>
          <p className="text-xs text-sky-200">
            Üst bardaki <strong>⚙️ Ayarlar</strong> sekmesine tıklayabilir veya mobil cihazlarda sağ üstteki
            menü butonunu açıp <strong>⚙️ Genel Ayarlar &amp; Bildirim Dağıtımı</strong> maddesini seçebilirsiniz.
            Ayrıca tarayıcı adres satırına doğrudan <C>/ayarlar</C> yazarak da erişebilirsiniz.
          </p>
        </div>

        <H3>Genel Ayarlar Masasında Bulunan 4 Ana Yönetim Bölümü</H3>

        <div className="space-y-3 my-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-sky-400">A.</span> E-Posta Alıcıları ve Kişiye Özel Bildirim Dağıtımı
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Birden fazla alıcı e-posta adresi ekleyebilir, her bir alıcının alacağı bildirim türlerini,
              piyasalarını ve mail sıklığını birbirinden bağımsız olarak özelleştirebilirsiniz:
            </p>
            <ul className="list-disc space-y-1 pl-5 mt-2 text-xs text-zinc-300">
              <li>
                <strong>Aktif / Pasif Anahtarı:</strong> Bir e-postayı silmeden geçici olarak bildirim dışı
                bırakabilirsiniz.
              </li>
              <li>
                <strong>Bildirim Türleri:</strong> 1. Çoklu Zaman Dilimi Raporları, 2. Portföy Stop-Loss/Kâr Al
                Alarmları, 3. İzleme Listesi Sinyal Değişimleri (her biri bağımsız açılıp kapatılabilir).
              </li>
              <li>
                <strong>Piyasa Kapsamı:</strong> Alıcının hangi piyasaları alacağı (BIST 🇹🇷, Kripto 🪙, Emtia &amp;
                FX 🥇, ABD Borsası 🇺🇸).
              </li>
              <li>
                <strong>Kişiye Özel Mail Sıklığı:</strong> Örneğin bir yönetici &quot;Günde 1 Kez&quot; özet alırken,
                aktif bir trader &quot;15 Dakika&quot; veya &quot;5 Dakika&quot; sıklığında bülten alabilir. (Belirtilmemişse piyasanın veya global bülten sıklığı geçerli olur).
              </li>
              <li>
                <strong>Test E-Postası Gönderimi:</strong> Eklediğiniz adresin mail alıp almadığını &quot;Test Maili
                Gönder&quot; butonuyla anında doğrulayabilirsiniz.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-sky-400">B.</span> Piyasa Bazlı Ayarlar &amp; Çift Yönlü Canlı Senkronizasyon
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Genel Ayarlar masasında her bir piyasa (BIST, Kripto, Emtia/Döviz, ABD Borsası) için sunulan
              tüm ayarlar, doğrudan o piyasanın kendi ekranındaki kontrollerle <strong>çift yönlü senkronize</strong> çalışır:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 mt-2 text-xs text-zinc-300">
              <li>
                <strong>⏱️ Bülten Tarama Sıklığı (Piyasa Bazlı):</strong> Çoklu Zaman Dilimi AL/SAT taramasının
                ve e-posta bülten üretiminin o piyasa için hangi aralıkla çalışacağını belirler. İster Genel Ayarlar&apos;dan
                ister Çoklu Zaman Dilimi ekranındaki zamanlayıcıdan değiştirin; iki taraf da anında güncellenir.
              </li>
              <li>
                <strong>⚡ Canlı Veri Yenileme Sıklığı (Çift Yönlü):</strong> Ekranlardaki geri sayım sayacıyla (AutoRefreshControl)
                birebir eşzamanlıdır. BIST Analist Konsensüsü &amp; Hedef Fiyatlar, BIST Değerleme Tablosu, Wall Street Analist
                Konsensüsü ve Amerikan Borsası Değerleme Tablosu dahil tüm ekranların yenileme sıklığı hem kendi ekranlarındaki
                sayaç kontrolünden hem de Genel Ayarlar masasından (/ayarlar) kolayca değiştirilebilir. Bir yerde süreyi değiştirdiğinizde
                tüm sekmeler, refresh-settings.md ve Genel Ayarlar anında güncellenir.
              </li>
              <li>
                <strong>📊 Varsayılan Endeks Kapsamı:</strong> BIST için BIST 30, BIST 100 veya TÜMÜ tercihini belirler;
                ilgili ekranlar açıldığında bu endeksle başlar.
              </li>
              <li>
                <strong>🛡️ / 📋 Pozisyon Masası ve İzleme Listesi Sıklıkları:</strong> Portföy Stop-Loss ve favori
                hisse sinyal değişim kontrollerinin sunucu arka plan sorgu periyotlarını belirler.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-emerald-400">C.</span> Genel Bülten Zamanlayıcı &amp; Scheduler Motoru
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Sunucu arka planında çalışan zamanlayıcı motorun küresel çalışma kurallarını belirler:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 mt-2 text-xs text-zinc-300">
              <li>
                <strong>Global Bülten Tarama Sıklığı:</strong> Eğer bir piyasa veya alıcı için özel bir sıklık
                belirlenmemişse geçerli olan nihai çatı bülten sıklığıdır (Varsayılan: 15 dk).
              </li>
              <li>
                <strong>Sadece Seans Saatlerinde Gönder:</strong> BIST seans saatleri (09:50 - 18:00) dışındayken
                bültenleri durdurur (Kripto piyasası 7/24 kesintisiz devam eder).
              </li>
              <li>
                <strong>Şimdi Tara &amp; Mail Gönder Butonu:</strong> Otomatik saati beklemeden tüm sistemi tarayıp
                tüm aktif alıcılara taze raporu anında postalar.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-amber-400">C.</span> Ekran Yenileme &amp; Canlı Piyasa Önbellek Sıklıkları
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Tarayıcı açıkken ekranın kaç saniyede bir otomatik güncelleneceğini ve piyasa bazlı veri tazelemeyi
              yönetir:
            </p>
            <ul className="list-disc space-y-1 pl-5 mt-2 text-xs text-zinc-300">
              <li>
                <strong>Global Ekran Yenileme:</strong> 15sn, 30sn, 1dk, 2dk, 5dk veya Kapalı seçenekleri.
              </li>
              <li>
                <strong>Piyasa Bazlı Ayrı Sıklıklar:</strong> BIST (30sn), Kripto (15sn - 7/24 hızlı piyasa), Emtia/FX
                (60sn), ABD Borsası (30sn).
              </li>
              <li>
                <strong>Önbelleği Temizle (Clear Cache) Butonu:</strong> Bellekteki tüm geçmiş verileri tek tıkla silip
                tüm panellerin en son borsa kotasyonunu doğrudan kaynağından çekmesini sağlar.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-rose-400">D.</span> Portföy &amp; İzleme Listesi Tarama Aralıkları
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Stop-Loss alarmlarının ve sinyal değişimlerinin sunucu tarafından arka planda kaç dakikada bir kontrol
              edileceğini belirler (1dk, 5dk, 15dk, 30dk, 1S, Günlük, Kapalı).
            </p>
          </div>
        </div>

        <Note tone="purple">
          <strong>Kalıcı Depolama Garantisi:</strong> Ayarlar ekranında yaptığınız her değişiklik anında proje
          içerisindeki yapılandırma dosyalarına (<C>mail-settings.md</C>, <C>mail-recipients.md</C>,{" "}
          <C>refresh-settings.md</C>, <C>portfoy-takip.md</C>, <C>watchlist.md</C>) yazılır. Sunucu yeniden başlasa
          bile tercihleriniz asla kaybolmaz.
        </Note>
      </Section>

      {/* ========================================================================= */}
      {/* 4. EKRAN YENİLEME & ÖNBELLEK (CACHE) SIKLIĞI */}
      {/* ========================================================================= */}
      <Section id="ekran-yenileme" title="4. Ekran Yenileme & Önbellek (Cache) Sıklığı">
        <p>
          Finans piyasalarında saniyeler dahi önemlidir; ancak her saniye yüzlerce hissenin grafiğini harici
          kaynaklardan çekmek kota aşımına (API rate-limit) ve sayfa donmalarına yol açabilir. Finans Asistanı,
          bu dengeyi <strong>Akıllı Önbellek (Smart Cache)</strong> ve <strong>Otomatik Ekran Yenileme</strong>{" "}
          ikilisiyle kusursuz biçimde çözer.
        </p>

        <H3>Ekran Yenileme Seçenekleri ve Davranışı</H3>
        <Table
          head={["Yenileme Aralığı", "Kullanım Amacı", "Veri Kaynağı Davranışı"]}
          rows={[
            [
              <strong key="15" className="text-amber-400">15 Saniye</strong>,
              "Kripto Para ve hızlı volatilite takibi",
              "Tarayıcı her 15 saniyede bir API'ye sessiz sorgu gönderir. Kripto gibi 7/24 hareketli piyasalar için idealdir.",
            ],
            [
              <strong key="30" className="text-sky-400">30 Saniye (Önerilen)</strong>,
              "BIST Seans İçi ve ABD Borsası",
              "Standart seans içi takip hızıdır; hem fiyat değişimlerini kaçırmaz hem de tarayıcı performansını korur.",
            ],
            [
              <strong key="60" className="text-zinc-200">1 Dakika (60sn)</strong>,
              "Emtia, Döviz ve Swing Trading",
              "Altın, petrol ve pariteler için oldukça dengeli bir hızdır.",
            ],
            [
              <strong key="120" className="text-zinc-400">2 Dakika - 5 Dakika</strong>,
              "Düşük internet kotası / Arka planda açık tutma",
              "Gereksiz veri trafiğini önler; uzun vadeli pozisyon takip edenler için uygundur.",
            ],
            [
              <strong key="off" className="text-zinc-500">Kapalı (Off)</strong>,
              "Yalnızca Manuel Yenileme",
              "Otomatik sorgu yapılmaz; veriler yalnızca siz &quot;Şimdi Yenile&quot; butonuna bastığınızda güncellenir.",
            ],
          ]}
        />

        <H3>Sunucu Önbelleği (Cache TTL) Nasıl Çalışır?</H3>
        <p>
          Uygulama sunucusu, seçtiğiniz ekran yenileme süresini (örneğin 30 saniye) önbellek yaşam süresi (TTL)
          olarak kullanır. Aynı 30 saniye içinde sayfayı 10 kez art arda yenileseniz dahi harici borsa sunucularına
          tekrar tekrar gitmez; hazır önbellekten milisaniyeler içinde yanıt döner.
        </p>
        <p>
          Ancak anlık bir kırılım, flaş bir haber veya ani bir fiyat sıçraması olduğunda, paneldeki{" "}
          <strong>🔄 Yenile</strong> butonuna basabilir veya Ayarlar ekranındaki <strong>Önbelleği Temizle</strong>{" "}
          seçeneğini kullanabilirsiniz. Bu işlem önbelleği baypas eder ve doğrudan en güncel piyasa kotasyonunu
          indirir.
        </p>
      </Section>

      {/* ========================================================================= */}
      {/* 5. E-POSTA GÖNDERİM SIKLIĞI & BİLDİRİM DAĞITIMI */}
      {/* ========================================================================= */}
      <Section id="mail-sistemi" title="5. E-Posta Gönderim Sıklığı & Bildirim Dağıtımı">
        <p>
          Finans Asistanı, ekran başında olmasanız bile sizi piyasadaki fırsatlardan ve risklerden anında haberdar
          etmek üzere gelişmiş bir <strong>E-Posta Bildirim Motoru</strong> içerir. Sistemde 3 farklı bildirim
          türü bulunur ve her birinin gönderim kuralları farklıdır.
        </p>

        <H3>3 Farklı E-Posta Bildirim Türü ve Tetiklenme Kuralları</H3>
        <Table
          head={["Bildirim Türü", "İçerik", "Tetiklenme Kuralı & Aciliyet", "Varsayılan Gönderim Sıklığı"]}
          rows={[
            [
              <div key="m1">
                <strong className="text-sky-300">1. Çoklu Zaman Dilimi Raporu</strong>
                <span className="block text-[11px] text-zinc-400">Toplu Piyasa Bülteni</span>
              </div>,
              "10 farklı mum periyodunda (5dk - Aylık) AL ve SAT sinyali üreten tüm hisselerin karma skorları, teknik ve temel analiz dökümü.",
              "Seçili piyasadaki tüm varlıklar taranır. Sinyal değişimi aranmaz; tarama anında AL veya SAT olan tüm hisseler raporlanır.",
              "Belirlenen mail sıklığında periyodik olarak gelir (Varsayılan: 15 Dakika). Seans içi kuralına tabidir.",
            ],
            [
              <div key="m2">
                <strong className="text-rose-400">2. Portföy Stop-Loss / Kâr Al Alarmı</strong>
                <span className="block text-[11px] text-zinc-400">Kritik Acil Alarm</span>
              </div>,
              "Pozisyon aldığınız hissenin Stop-Loss veya Kâr Al seviyesine ulaştığı bilgisi; giriş fiyatı, güncel fiyat, kâr/zarar % oranı.",
              "Fiyat stop veya hedef seviyesine değdiği anda ANINDA gönderilir! Periyodik mail saati beklenmez. Spam olmaması için olay başına bir kez gönderilir ve pozisyon durumu güncellenir.",
              "Portföy Tarama Sıklığına göre (1 dk - 15 dk). Hedefe ulaşıldığı an beklemeksizin iletilir.",
            ],
            [
              <div key="m3">
                <strong className="text-violet-300">3. İzleme Listesi Sinyal Değişimi</strong>
                <span className="block text-[11px] text-zinc-400">Favori Hisse Takibi</span>
              </div>,
              "İzleme listenize eklediğiniz hisselerin sinyali bir önceki kontrole göre değiştiğinde (örn: TUT → AL veya AL → SAT) oluşan uyarı.",
              "Yalnızca sinyal durumunda bir değişim yaşandığında gönderilir. Durum aynı kaldığı sürece gereksiz e-posta atılmaz.",
              "Watchlist kontrol aralığına göre (1 dk - 1 saat veya seans kapanışlarında günde 2 kez Vercel Cron).",
            ],
          ]}
        />

        <H3>Bülten Tarama Motoru vs. Kişisel Mail Sıklığı: Sistem Nasıl Çalışır?</H3>
        <p>
          Finans Asistanı&apos;nda e-posta gönderim mekanizması iki katmanlı (birlikte ve koordineli) bir mimariyle
          çalışır. Bu iki ayar birbirini ezmez; sistem kaynaklarını korurken kişisel tercihleri de tam olarak karşılar:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-1">
              ① Veri Tarama Motoru Sıklığı
            </div>
            <p className="text-sm font-bold text-zinc-100">Bülten Tarama Sıklığı (Piyasa / Global)</p>
            <p className="text-xs text-zinc-300 mt-1">
              Sistemin piyasayı tarayıp sinyalleri hesapladığı temel çalışma frekansıdır (Örn: BIST için 15 dk).
              Bu süre dolmadıkça o piyasa için yeni bir tarama yapılmaz ve hiçbir kullanıcıya mail çıkmaz.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
              ② Kişisel Dağıtım Filtresi
            </div>
            <p className="text-sm font-bold text-zinc-100">Alıcı Bazlı Mail Sıklığı</p>
            <p className="text-xs text-zinc-300 mt-1">
              Tarama motoru çalıştığında, listedeki her bir alıcının kendi sıklığına bakar. Motor 15 dakikada
              bir çalışsa bile &quot;1 Saat&quot; seçen bir alıcıya sadece saatte bir mail gider.
            </p>
          </div>
        </div>

        <H3>3 Kademeli Hiyerarşik Öncelik Zinciri</H3>
        <p className="text-xs text-zinc-300">
          Bir alıcıya hangi sıklıkla e-posta gönderileceği aşağıdaki öncelik sırasına göre kararlaştırılır:
        </p>

        <Table
          head={["Kademe", "Ayar Yeri", "Öncelik Kuralı", "Açıklama"]}
          rows={[
            [
              <strong key="k1" className="text-emerald-400">1. Kademe (En Yüksek)</strong>,
              "E-Posta Alıcıları Masası",
              "Alıcının Kendi Özel Sıklığı",
              "Alıcıya özel bir sıklık (örn: 1 Saat veya Günlük) tanımlanmışsa bu sıklık geçerlidir.",
            ],
            [
              <strong key="k2" className="text-sky-400">2. Kademe</strong>,
              "Genel Ayarlar & Piyasa Ekranı",
              "Piyasanın Bülten Tarama Sıklığı",
              "Alıcıda özel bir sıklık seçilmemişse ('Genel Ayar'), taranan piyasanın (BIST, Kripto vb.) bülten sıklığı baz alınır.",
            ],
            [
              <strong key="k3" className="text-amber-400">3. Kademe (Nihai Varsayılan)</strong>,
              "Genel Bülten Zamanlayıcı",
              "Global Bülten Tarama Sıklığı",
              "O piyasaya özel bir ayar da yapılmamışsa tüm sistemin çatı değeri olan Global sıklık (15 dk) devreye girer.",
            ],
          ]}
        />

        <H3>Kritik Davranış Kuralları &amp; Senaryolar</H3>
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-zinc-300">
          <li>
            <strong>Alıcı Sıklığı Motor Sıklığından Seyrekse (Örn: Motor 15 dk, Alıcı 1 Saat):</strong> Motor her 15 dakikada
            bir piyasayı tarar; fakat bu alıcıya sadece saatte 1 kez bülten postalar. Kullanıcı gelen kutusu gereksiz yere boğulmaz.
          </li>
          <li>
            <strong>Alıcı Sıklığı Motor Sıklığından Hızlıysa (Örn: Motor 1 Saat, Alıcı 5 Dakika):</strong> Motor saatte bir
            çalıştığı için sistem 5 dakikada bir veri üretmez. Alıcı en fazla motorun çalıştığı sıklıkta (saatte 1) mail alır.
          </li>
          <li>
            <strong>Çift Yönlü Senkronizasyon:</strong> İster Genel Ayarlar sayfasından ister Çoklu Zaman Dilimi AL/SAT
            ekranının başlığındaki zamanlayıcıdan sıklığı değiştirin, iki taraf da <C>mail-settings.md</C> dosyasını
            güncelleyerek birbirini anında senkronize eder.
          </li>
        </ul>

        <H3>E-Posta Servis Sağlayıcı Ayarları (.env.local)</H3>
        <p>
          E-postaların başarıyla ulaşabilmesi için sunucu ortam değişkenlerinde aşağıdaki tanımlardan en az biri
          yapılmış olmalıdır:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-300">
          <li>
            <C>GMAIL_USER</C> ve <C>GMAIL_APP_PASSWORD</C>: Google Hesabı üzerinden ücretsiz gönderim (Google Hesap
            Güvenliği sayfasından 16 haneli &quot;Uygulama Şifresi&quot; oluşturulmalıdır; normal e-posta şifreniz
            kabul edilmez).
          </li>
          <li>
            <C>RESEND_API_KEY</C>: Profesyonel transactional e-posta servisi (Resend üzerinden anlık teslimat).
          </li>
        </ul>
      </Section>

      {/* ========================================================================= */}
      {/* 6. PORTFÖY TAKİBİ & PORTFÖY TARAMA SIKLIĞI */}
      {/* ========================================================================= */}
      <Section id="portfoy-tarama" title="6. Portföy Takibi & Portföy Tarama Sıklığı (Stop-Loss / Kâr Al)">
        <p>
          Yatırımda en önemli kural sermayeyi korumak ve kârı realize etmektir.{" "}
          <Link href="/pozisyonlar" className="font-bold text-rose-400 underline">
            Portföy Masası (/pozisyonlar)
          </Link>
          , aldığınız hisseleri Stop-Loss (Zarar Durdur) ve Take-Profit (Kâr Al) hedefleriyle kayıt altına alır.
        </p>

        <H3>Portföy Tarama Sıklığı Nedir ve Nasıl Çalışır?</H3>
        <p>
          <strong>Portföy Tarama Sıklığı</strong>, sunucu arka plan servisinin portföyünüzdeki açık pozisyonların
          fiyatını borsa sunucularından kaç dakikada bir sorgulayacağını belirleyen parametredir.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-zinc-300">
          <li>
            <strong>1 Dakika:</strong> Çok agresif canlı takip. Ani çökmeler veya tavana giden hisselerde saniyeler
            içinde alarm üretir.
          </li>
          <li>
            <strong>5 Dakika (Varsayılan):</strong> Hem sunucu trafiğini yormayan hem de gün içi zararları minimize
            eden ideal standarttır.
          </li>
          <li>
            <strong>15 Dakika / 30 Dakika / 1 Saat:</strong> Orta-uzun vadeli hisse taşıyan ve gün içi küçük dalgalanmalardan
            etkilenmek istemeyenler için.
          </li>
          <li>
            <strong>Kapalı:</strong> Otomatik arka plan fiyat kontrolü yapılmaz; yalnızca ekrandaki &quot;Fiyatları
            Sorgula&quot; butonuna bastığınızda kontrol edilir.
          </li>
        </ul>

        <H3>Dinamik ATR Risk Yönetimi ve Otomatik Seviye Önerisi</H3>
        <p>
          Pozisyon eklerken stop veya hedef belirlemekte zorlanıyorsanız, hisse detayında sunulan dinamik{" "}
          <strong>ATR (Ortalama Gerçek Aralık)</strong> formülünü kullanabilirsiniz:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
            <span className="text-xs font-bold text-rose-300 uppercase">Önerilen Stop-Loss Formülü</span>
            <p className="mt-1 font-mono text-sm font-bold text-rose-200">Stop-Loss = Alış Fiyatı - (1,5 × ATR)</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Hissenin normal günlük dalgalanma gürültüsüne pay bırakarak erken stop olmanızı engeller.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <span className="text-xs font-bold text-emerald-300 uppercase">Önerilen Kâr Al Formülü</span>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-200">Kâr Al Hedefi = Alış Fiyatı + (2,5 × ATR)</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Risk/Kazanç oranını yaklaşık <strong>1 : 1,67</strong> seviyesine taşıyarak uzun vadede kârlı bir matematik kurar.
            </p>
          </div>
        </div>

        <H3>Pozisyon Durumları (Yaşam Döngüsü)</H3>
        <p>Eklediğiniz her pozisyon aşağıdaki durumlardan birinde bulunur:</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-300">
          <li>
            <span className="font-bold text-sky-400">Aktif:</span> Fiyat henüz stop veya hedef seviyesine ulaşmamıştır;
            canlı kâr/zarar % oranı anlık hesaplanır.
          </li>
          <li>
            <span className="font-bold text-red-400">Stop-Loss Gerçekleşti:</span> Fiyat belirlediğiniz stop seviyesine
            eşit veya altına inmiştir. E-posta alarmı gönderilmiş ve durum kilitlenmiştir.
          </li>
          <li>
            <span className="font-bold text-emerald-400">Kâr Al Hedefi Gerçekleşti:</span> Fiyat hedeflediğiniz seviyeye
            ulaşmış veya üstüne çıkmıştır. Zafer alarmı e-postası gönderilmiştir.
          </li>
          <li>
            <span className="font-bold text-zinc-400">Kapatıldı:</span> Kendi isteğinizle satıp kapattığınız pozisyonlar.
          </li>
        </ul>
      </Section>

      {/* ========================================================================= */}
      {/* 7. İZLEME LİSTESİ & SİNYAL DEĞİŞİM KONTROLÜ */}
      {/* ========================================================================= */}
      <Section id="izleme-listesi" title="7. İzleme Listesi & Sinyal Değişim Kontrolü (Watchlist)">
        <p>
          <Link href="/takip" className="font-bold text-violet-400 underline">
            İzleme Listesi Masası (/takip)
          </Link>
          , sürekli radarınızda tutmak istediğiniz favori hisseleri, altın/döviz varlıklarını veya kripto paraları
          tek bir tabloda izlemenizi sağlar.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-zinc-300">
          <li>
            <strong>Kolay Yönetim:</strong> Varlık arama kutusundan hızlıca ekleyebilir, tek tıkla silebilirsiniz.
          </li>
          <li>
            <strong>Piyasa Sekmeleri:</strong> BIST hisseleri, Kriptolar, Emtialar ve ABD hisseleri arasında sekmelerle
            filtreleme yapabilirsiniz.
          </li>
          <li>
            <strong>Sinyal Değişim Kontrol Sıklığı:</strong> 1dk, 5dk, 15dk, 30dk, 1S, Günlük veya Kapalı.
            Belirlenen sıklıkta arka plan motoru listenizdeki hisselerin sinyalini kıyaslar.
          </li>
          <li>
            <strong>Anlık Sinyal Değişim E-Postası:</strong> Örneğin listenizdeki bir hisse haftalardır TUT
            sinyalindeyken aniden güçlü hacimle <strong>AL</strong> sinyaline dönerse, sistem durumu tespit edip
            derhal &quot;Sinyal Değişimi: THYAO AL&quot; başlığıyla alıcılara e-posta uyarısı yollar.
          </li>
        </ul>
      </Section>

      {/* ========================================================================= */}
      {/* 8. HİSSELER VE VARLIKLAR NEYE GÖRE BELİRLENİR? */}
      {/* ========================================================================= */}
      <Section id="puanlama" title="8. Hisseler ve Varlıklar Neye Göre Belirlenir?">
        <p>
          Finans Asistanı, hiçbir hisseyi rastgele veya hissi duygularla listelemez. İncelenen her şirket için
          üç ayrı matematiksel skor üretilir ve tüm skorlar <strong>-1,00 ile +1,00</strong> arasında normalize edilir:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <span className="text-xs font-bold text-sky-400 uppercase">1. Teknik Skor</span>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
              Fiyat hareketleri, hacim, trend çizgileri, hareketli ortalamalar ve osilatörlerin (RSI, MACD, ADX,
              Bollinger vb.) ağırlıklı toplamıdır.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <span className="text-xs font-bold text-indigo-400 uppercase">2. Temel Skor</span>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
              Şirketin bilançosu, kârlılık marjları, F/K, PD/DD, PEG oranları, borçluluk ve büyüme rasyolarından
              elde edilen temel sağlamlık puanıdır.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <span className="text-xs font-bold text-emerald-400 uppercase">3. Karma (Nihai) Skor</span>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
              Seçilen analiz periyoduna göre teknik ve temel skorun harmanlanmasıyla elde edilen nihai karar
              skorudur. AL/SAT sinyali bu skora göre verilir.
            </p>
          </div>
        </div>

        <H3>Sinyal Üretim Eşikleri</H3>
        <Table
          head={["Karar", "Teknik Skor Eşiği", "Temel Skor Eşiği", "Karma (Nihai) Skor Eşiği"]}
          rows={[
            [
              <span key="a" className="font-bold text-emerald-400">AL</span>,
              "Skor ≥ +0,25",
              "Skor ≥ +0,25",
              <strong key="ak" className="text-emerald-400">Skor ≥ +0,28</strong>,
            ],
            [
              <span key="t" className="font-bold text-amber-400">TUT</span>,
              "-0,25 &lt; Skor &lt; +0,25",
              "-0,25 &lt; Skor &lt; +0,25",
              <strong key="tk" className="text-amber-400">-0,28 &lt; Skor &lt; +0,28</strong>,
            ],
            [
              <span key="s" className="font-bold text-red-400">SAT</span>,
              "Skor ≤ -0,25",
              "Skor ≤ -0,25",
              <strong key="sk" className="text-red-400">Skor ≤ -0,28</strong>,
            ],
          ]}
        />
        <p className="text-xs text-zinc-400">
          <strong>Lider Sinyaller Sıralaması:</strong> Seçili periyotta taranan hisseler en yüksek karma skordan en
          düşüğe dizilir. En yüksek pozitif skora sahip 5 hisse <strong>Lider AL</strong>, en düşük negatif skora
          sahip 5 hisse ise <strong>Lider SAT</strong> panosunda yer alır.
        </p>

        <H3>🎯 Kurumsal Analist Hedef Fiyatları &amp; Getiri Potansiyeli Nasıl Hesaplanır?</H3>
        <p className="text-xs text-zinc-300">
          Finans Asistanı, kendi matematiksel teknik ve temel skorlarının yanı sıra kurumsal yatırım dünyasının ve
          lisanslı aracı kurumların (İş Yatırım, Garanti BBVA, Ak Yatırım, Yapı Kredi, HSBC vb.) öngörülerini de yatırımcılara sunar:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-sm text-zinc-200 mb-1">1. Ortalama Hedef Fiyat (Target Mean Price)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              İlgili şirketi resmi olarak takip eden tüm aracı kurum ve yatırım bankası analistlerinin
              yayınladığı 12 aylık adil değer modellemelerinin ağırlıklı aritmetik ortalamasıdır.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h4 className="font-bold text-sm text-zinc-200 mb-1">2. Getiri Potansiyeli (%) Formülü</h4>
            <p className="text-xs font-mono text-emerald-400 mb-1">
              Potansiyel (%) = ((Hedef Fiyat - Canlı Fiyat) / Canlı Fiyat) × 100
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Analistlerin konsensüs hedefi güncel borsa fiyatından ne kadar yüksekse yeşil renkte pozitif getiri potansiyeli olarak listelenir.
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          <strong>Analist Konsensüs Rozetleri:</strong> Kurumların genel tavsiye eğilimine göre kartlarda{" "}
          <span className="text-emerald-400 font-semibold">Güçlü AL</span>,{" "}
          <span className="text-emerald-300 font-semibold">AL</span>,{" "}
          <span className="text-amber-400 font-semibold">TUT</span> veya{" "}
          <span className="text-red-400 font-semibold">SAT</span> rozeti ve ankete katılan analist sayısı (örneğin <em>13 Analist</em>) birlikte gösterilir.
        </p>
      </Section>

      {/* ========================================================================= */}
      {/* 9. TEKNİK ANALİZ METODOLOJİSİ */}
      {/* ========================================================================= */}
      <Section id="teknik" title="9. Teknik Analiz Metodolojisi (4 Kategori, 9 Gösterge)">
        <p>
          Teknik analiz motoru, tek bir indikatöre bağlı kalmanın getireceği yanılgıları önlemek için 4 farklı
          kategoride toplam 9 bağımsız teknik göstergeyi eş zamanlı analiz eder.
        </p>
        <Table
          head={["Kategori", "Ağırlık", "Kullanılan Göstergeler", "Değerlendirme Mantığı"]}
          rows={[
            [
              "Ana Trend",
              "%35",
              "Fiyat/SMA200, EMA20/EMA50, SMA50/SMA200",
              "Fiyat SMA200 üzerindeyse boğa bölgesi (+), altındaysa ayı (-). Golden Cross (50>200) ve EMA sıralaması trend yönünü doğrular.",
            ],
            [
              "Trend Gücü & Rejim",
              "%25",
              "ADX(14), +DI / -DI",
              "ADX ≥ 25 ise güçlü trend vardır; yön +DI / -DI farkına göre belirlenir. ADX < 20 ise piyasa yatay kabul edilir.",
            ],
            [
              "Momentum & Zamanlama",
              "%25",
              "MACD(12,26,9), RSI(14), Stokastik(14,3)",
              "MACD sinyal çizgisi kesişimi; RSI < 30 aşırı satım (+), RSI > 70 aşırı alım (-). Güçlü trendde osilatör uyarıları trend yönüne göre yumuşatılır.",
            ],
            [
              "Hacim & Volatilite",
              "%15",
              "Hacim (20 dönem ortalaması), Bollinger Bantları(20,2)",
              "Ortalama hacmin 1,3 katı üzerindeki yükselişler alımı kuvvetlendirir (+). Fiyat alt banda değdiğinde tepki alımı (+), üst banda değdiğinde direnç kabul edilir.",
            ],
          ]}
        />
        <Note>
          Daha ayrıntılı matematiksel formüller ve kod mantığı için{" "}
          <Link href="/teknik-detay-klavuzu" className="font-bold underline text-indigo-300">
            Teknik Detay Kılavuzu
          </Link>{" "}
          sayfamızı ziyaret edebilirsiniz.
        </Note>
      </Section>

      {/* ========================================================================= */}
      {/* 10. TEMEL ANALİZ METODOLOJİSİ */}
      {/* ========================================================================= */}
      <Section id="temel" title="10. Temel Analiz Metodolojisi (Sanayi vs. Bankacılık)">
        <p>
          Temel analizde şirketlerin finansal tabloları analiz edilir. Finans sektöründe (Bankalar, Holdingler,
          Sigortalar) mevduat borç olarak geçtiğinden geleneksel cari oran veya borç rasyoları anlamsızdır. Bu
          yüzden sistem <strong>Sanayi Şirketleri</strong> ve <strong>Bankalar / Finans Kuruluşları</strong> için
          farklı ağırlık matrisleri uygular.
        </p>
        <Table
          head={["Kategori", "Sanayi / Banka Ağırlığı", "Pozitif (AL) Eşikleri", "Negatif (SAT) Eşikleri"]}
          rows={[
            [
              "Kârlılık",
              "%35 / %45",
              "Net Kâr Marjı ≥ %10, Faaliyet Marjı ≥ %15, ROE ≥ %15 (Banka %20), ROA ≥ %5 (Banka %1,8)",
              "Negatif kâr marjı, ROE < %5 (Banka %10), ROA < %1 (Banka %0,8)",
            ],
            [
              "Değerleme",
              "%30 / %40",
              "PEG 0 - 1,0, F/K 0 - 15 (Banka 0 - 7), PD/DD < 1,5 (Banka < 0,9)",
              "PEG > 2,0 veya negatif, F/K > 30 (Banka > 12), PD/DD > 4,0 (Banka > 1,8)",
            ],
            [
              "Mali Sağlamlık",
              "%25 / %0",
              "Cari Oran ≥ 1,20, Borç / Özkaynak < %100 (Bankalarda sıfır ağırlık)",
              "Cari Oran < 1,00, Borç / Özkaynak > %200",
            ],
            [
              "Büyüme & Temettü",
              "%10 / %15",
              "Gelir Büyümesi ≥ %10, Temettü Verimi ≥ %2,0",
              "Gelir büyümesi negatif veya ciro daralması",
            ],
          ]}
        />
        <p className="text-xs text-zinc-400">
          Kripto paralarda veya döviz/emtia varlıklarında bilanço bulunmadığından temel analiz skoru uygulanmaz;
          karar <strong>%100 teknik analiz</strong> ile üretilir.
        </p>
      </Section>

      {/* ========================================================================= */}
      {/* 11. KARMA KARAR & PERİYOT STRATEJİLERİ */}
      {/* ========================================================================= */}
      <Section id="karma" title="11. Karma Karar & Periyot Stratejileri">
        <p>
          Kısa vadeli grafiklerde fiyatı bilanço değil likidite ve anlık teknik momentum belirler; uzun vadeli
          grafiklerde ise şirketin temel sağlamlığı baskındır. Bu nedenle teknik ve temel analizin karma skordaki
          ağırlıkları seçilen zaman dilimine göre dinamik olarak değişir:
        </p>
        <Table
          head={["Mum Periyodu", "Teknik Ağırlık", "Temel Ağırlık", "Yatırımcı Profili & Strateji"]}
          rows={[
            ["5 dk, 10 dk", "%95", "%5", "Çok hızlı gün içi işlem (Scalping)"],
            ["15 dk, 30 dk", "%90", "%10", "Gün içi aktif al-sat (Day Trading)"],
            ["1 Saat, 2 Saat", "%80", "%20", "2-3 günlük kısa vade"],
            ["4 Saat", "%70", "%30", "1-2 haftalık salınım (Swing Trading - Çok Popüler)"],
            ["1 Gün (Günlük)", "%60", "%40", "Orta vadeli trend takibi (1 - 3 ay)"],
            ["1 Hafta (Haftalık)", "%45", "%55", "Uzun vadeli yatırım (3 - 12 ay)"],
            ["1 Ay (Aylık)", "%35", "%65", "Değer ve temettü yatırımı (1 yıl+)"],
          ]}
        />

        <H3>Çoklu Zaman Dilimi Teyit Matrisi</H3>
        <Table
          head={["İşlem Amacınız", "Tetikleyici Giriş Periyodu", "Ana Trend Sinyali", "Üst Trend Filtresi"]}
          rows={[
            ["Gün İçi Al-Sat", "5 Dakika", "15 Dakika", "1 Saat"],
            ["Kısa Vade (2-3 Gün)", "15 Dakika", "1 Saat", "4 Saat"],
            ["Swing Trade (~2 Hafta)", "1 Saat", "Günlük (1D)", "Haftalık (1W)"],
            ["Büyük Trend (1-6 Ay)", "Günlük (1D)", "Haftalık (1W)", "Aylık (1M)"],
          ]}
        />
      </Section>

      {/* ========================================================================= */}
      {/* 12. SEANS SAATLERİ, İPUÇLARI & GÜVENLİK UYARILARI */}
      {/* ========================================================================= */}
      <Section id="ipuclari" title="12. Seans Saatleri, İpuçları & Güvenlik Uyarıları">
        <H3>Piyasaların Seans Saatleri</H3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-300">
          <li>
            <strong>Borsa İstanbul (BIST):</strong> Hafta içi her gün <strong>09:50 - 18:00</strong> saatleri
            arasındadır (Açılış seansı 09:40-09:55, sürekli müzayede 10:00-18:00, kapanış marjı 18:05).
          </li>
          <li>
            <strong>Kripto Para Piyasaları:</strong> <strong>7 gün 24 saat</strong> kesintisizdir; hafta sonu veya tatil
            yoktur.
          </li>
          <li>
            <strong>ABD Borsaları (NYSE &amp; NASDAQ):</strong> Türkiye saati ile <strong>16:30 - 23:00</strong>{" "}
            arasındadır.
          </li>
          <li>
            <strong>Emtia &amp; Forex:</strong> Pazar gecesi 01:00 ile Cuma gecesi 23:59 arası 24 saat işlem görür.
          </li>
        </ul>

        <H3>Başarılı İşlemler İçin Kritik Altın İpuçları</H3>
        <ul className="list-disc space-y-2 pl-5 text-xs text-zinc-300">
          <li>
            <strong>Tek Göstergeyle Karar Vermeyin:</strong> Sadece RSI aşırı satımda diye veya sadece tek bir mum
            yeşil yaktı diye alım yapmayın; mutlaka karma skordaki teknik + temel uyumuna bakın.
          </li>
          <li>
            <strong>Yatay Piyasaya Dikkat (ADX &lt; 20):</strong> Piyasa yatay trenddeyken hareketli ortalamalar
            (EMA/SMA) çok sayıda sahte AL/SAT sinyali üretebilir. Böyle dönemlerde Bollinger bantları ve Stokastik
            daha güvenilirdir.
          </li>
          <li>
            <strong>Disiplinli Stop-Loss:</strong> Bir hisseye girmeden önce mutlaka zarar kes seviyenizi belirleyin ve{" "}
            <Link href="/pozisyonlar" className="font-bold underline text-rose-300">
              Portföy Masasına
            </Link>{" "}
            kaydedin. Beklenmedik düşüşlerde e-posta uyarısını aldığınızda duygusallığa kapılmadan planınıza sadık kalın.
          </li>
          <li>
            <strong>BIST 30 vs. BIST TÜM Farkı:</strong> BIST TÜM taraması 800&apos;den fazla hisseyi kapsadığı için
            tarama süresi daha uzundur. Günlük seri işlemler için likiditesi yüksek olan BIST 30 veya BIST 100 endeksini
            tercih etmeniz tavsiye edilir.
          </li>
        </ul>

        <Note tone="success">
          <strong>Öneri:</strong> Sistemin tüm ayarlarını tek bir merkezden görmek, test maili yollamak ve tarama
          sıklıklarını özelleştirmek için hemen{" "}
          <Link href="/ayarlar" className="font-bold underline text-emerald-200">
            Genel Ayarlar &amp; Bildirim Dağıtımı Masasını (/ayarlar)
          </Link>{" "}
          ziyaret edebilirsiniz.
        </Note>
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kullanım Kılavuzu · Finans Asistanı",
  description:
    "Finans Asistanı ekran bölümleri, teknik ve temel analiz puanlama mantığı, ayarlar ve e-posta bildirimlerinin ayrıntılı kullanım kılavuzu.",
};

const TOC = [
  { id: "genel", label: "1. Genel Bakış" },
  { id: "bolumler", label: "2. Ekran Bölümleri" },
  { id: "puanlama", label: "3. Hisseler Neye Göre Belirlenir?" },
  { id: "teknik", label: "4. Teknik Analiz" },
  { id: "temel", label: "5. Temel Analiz" },
  { id: "karma", label: "6. Karma Karar & Periyot Ağırlığı" },
  { id: "ayarlar", label: "7. Ayarlar" },
  { id: "mail", label: "8. E-Posta Bildirimleri" },
  { id: "ipuclari", label: "9. İpuçları & Uyarılar" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-7"
    >
      <h2 className="mb-4 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-base font-semibold text-zinc-100">{children}</h3>;
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-zinc-800/30">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
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

function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const cls =
    tone === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return <div className={`rounded-xl border px-4 py-3 text-xs sm:text-sm ${cls}`}>{children}</div>;
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300">{children}</code>
);

export default function KullanimKilavuzuPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
          📖 Kullanım Kılavuzu
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          Finans Asistanı Kullanım Kılavuzu
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Ekrandaki her bölümün ne işe yaradığı, AL / SAT / TUT sinyallerinin teknik ve temel analize göre nasıl
          üretildiği, ayarlar ve hangi bölümler için ne zaman e-posta geldiği bu sayfada anlatılır.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-sky-400 transition hover:text-sky-300"
        >
          ← Ana ekrana dön
        </Link>
      </header>

      <nav
        aria-label="İçindekiler"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">İçindekiler</p>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="block rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-sky-300"
              >
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="genel" title="1. Genel Bakış">
        <p>
          Finans Asistanı, Borsa İstanbul (BIST) hisseleri için <strong>teknik</strong> ve <strong>temel</strong> analizi
          birleştirerek her hisse için bir <strong>karar destek puanı</strong> ve <strong>AL / SAT / TUT</strong> sinyali
          üretir. Veri kaynağı Yahoo Finance&apos;tir. Fiyat verisi gecikmeli olabilir.
        </p>
        <Table
          head={["Sinyal", "Anlamı"]}
          rows={[
            [<span key="a" className="font-bold text-emerald-400">AL</span>, "Puan eşiğin üzerinde; pozitif görünüm."],
            [<span key="t" className="font-bold text-amber-400">TUT</span>, "Belirgin yön yok; bekle-gör."],
            [<span key="s" className="font-bold text-red-400">SAT</span>, "Puan eşiğin altında; negatif görünüm."],
          ]}
        />
        <Note tone="warn">
          Bu uygulama bir karar destek aracıdır, <strong>yatırım tavsiyesi değildir</strong>. Nihai karar ve risk
          size aittir.
        </Note>
      </Section>

      <Section id="bolumler" title="2. Ekran Bölümleri (yukarıdan aşağıya)">
        <H3>Üst çubuk</H3>
        <p>
          Logo (ana sayfaya döner), her sayfada duran <strong>hızlı hisse arama</strong> kutusu (kod veya ad yazın,
          seçince hisse detay sayfası açılır), <strong>Kullanım Kılavuzu</strong> bağlantısı ve seans bilgisi
          (09:50 - 18:00 Pazartesi-Cuma).
        </p>

        <H3>① Tüm BIST Şirketleri (Arama alanı)</H3>
        <p>
          800+ şirket arasında arama yapın. <strong>Analiz Periyodu</strong> düğmeleri ile (5dk - Aylık) analizin hangi
          mum periyoduyla hesaplanacağını seçin. Seçtiğiniz hisse için altta bir önizleme kartı açılır (karma skor,
          teknik/temel sinyal, ayrıntılı nedenler). <strong>Hızlı erişim</strong> düğmeleri (THYAO, ASELS, GARAN...)
          tek tıkla aynı önizlemeyi getirir. Seçtiğiniz periyot hatırlanır.
        </p>

        <H3>② Aktif Pozisyon Takibi (Stop-Loss / Kâr Al Masası)</H3>
        <p>
          Aldığınız hisseyi giriş fiyatı, periyodu, <strong>Stop-Loss</strong> ve <strong>Kâr Al</strong> seviyeleriyle
          kaydedersiniz. Sistem fiyatı belirli aralıklarla kontrol eder; stop&apos;a veya hedefe ulaşılırsa{" "}
          <strong>e-posta alarmı</strong> gönderir ve pozisyonun durumunu günceller (Aktif → Stop-Loss / Kâr Al
          gerçekleşti). Satırlarda anlık fiyat, kâr/zarar yüzdesi, stop ve hedefe uzaklık görünür. Elle kontrol için
          “fiyatları sorgula” düğmesi vardır. Kayıtlar <C>portfoy-takip.md</C> dosyasında tutulur.
        </p>

        <H3>③ Çoklu Zaman Dilimi Sinyalleri</H3>
        <p>
          Seçili endeksteki (BIST 30 veya BIST TÜM) tüm hisseler <strong>10 periyotta</strong> (5dk, 10dk, 15dk, 30dk, 1S,
          2S, 4S, Günlük, Haftalık, Aylık) taranır. Sekmelerde her periyot için <strong>AL verenler</strong> ve{" "}
          <strong>SAT verenler</strong> puan sırasıyla listelenir. Bu bölümün başlığında e-posta sıklığı ve alıcı
          ayarları ile <strong>“Şimdi Tara &amp; Mail Gönder”</strong> düğmesi bulunur.
        </p>

        <H3>④ Lider Sinyaller (En Yüksek AL / SAT Puanı)</H3>
        <p>
          Seçili endeksteki hisseler seçili periyotta puanlanır; en yüksek 5 <strong>AL</strong> ve en düşük 5{" "}
          <strong>SAT</strong> adayı iki kartta gösterilir. Her satırda fiyat, günlük değişim, teknik/temel skor ve
          en önemli neden yer alır. Endeks tipi, periyot ve yenileme sıklığı bu bölümden değiştirilir.
        </p>

        <H3>⑤ Sinyal Karşılaştırma (Takip Listem)</H3>
        <p>
          Hisse detayında <strong>“Takibe Al”</strong> dediğiniz kayıtların, kayıt anındaki sinyal ve fiyatı ile
          güncel fiyatı karşılaştırılır; değişim yüzdesi görürsünüz. Böylece sinyalin sonradan ne kadar isabetli
          olduğunu ölçersiniz. Kayıtlar <C>takiplistem.md</C> dosyasındadır.
        </p>

        <H3>⑥ Takip Listesi (İzleme Listesi)</H3>
        <p>
          Sürekli izlemek istediğiniz hisse (veya altın) listesidir. Arama kutusundan ekler, çöp kutusu ile
          kaldırırsınız. Her satırda güncel fiyat, sinyal ve skor gösterilir; periyodu ve yenileme sıklığını
          buradan seçersiniz. Liste <C>watchlist.md</C> dosyasına kaydedilir ve{" "}
          <strong>sinyal değişimi e-postası</strong> için kullanılır (bkz. Bölüm 8).
        </p>

        <H3>Hisse Detay Sayfası</H3>
        <p>
          Bir hisseye tıklayınca: fiyat grafiği, RSI/MACD grafikleri, <strong>Karma / Teknik / Temel sinyal</strong>{" "}
          kartları, kategori bazlı skor dökümü, ADX piyasa rejimi, ATR bazlı dinamik Stop-Loss/Kâr Al önerisi ve
          temel rasyoların tek tek puan nedenleri görülür.
        </p>
      </Section>

      <Section id="puanlama" title="3. Hisseler Neye Göre Belirlenir?">
        <p>Her hisse için üç puan üretilir; hepsi <strong>-1 ile +1</strong> arasındadır:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li><strong>Teknik skor:</strong> Fiyat/hacim grafiğinden hesaplanan indikatörler.</li>
          <li><strong>Temel skor:</strong> Şirketin bilanço ve değerleme rasyoları.</li>
          <li><strong>Karma skor:</strong> İkisinin seçili periyoda göre ağırlıklı birleşimi (nihai sinyal budur).</li>
        </ol>
        <Table
          head={["Puan", "Teknik / Temel sinyal eşiği", "Karma (nihai) sinyal eşiği"]}
          rows={[
            ["AL", "skor ≥ +0,25", "skor ≥ +0,28"],
            ["TUT", "-0,25 ile +0,25 arası", "-0,28 ile +0,28 arası"],
            ["SAT", "skor ≤ -0,25", "skor ≤ -0,28"],
          ]}
        />
        <p>
          Lider Sinyaller listesinde hisseler karma skora göre sıralanır; yüksek pozitif skorlar AL, düşük negatif
          skorlar SAT listesine girer.
        </p>
      </Section>

      <Section id="teknik" title="4. Teknik Analiz (4 kategori, 9 gösterge)">
        <p>
          Her gösterge -1 ile +1 arası puan ve bir ağırlık alır; kategori içinde ağırlıklı ortalama alınır, sonra
          kategoriler aşağıdaki oranlarla birleştirilir.
        </p>
        <Table
          head={["Kategori", "Ağırlık", "Göstergeler", "Mantık"]}
          rows={[
            [
              "Ana Trend",
              "%35",
              "Fiyat/SMA200, EMA20/EMA50, SMA50/SMA200",
              "Fiyat SMA200 üstünde ise boğa bölgesi (+), altında ayı (-). EMA/SMA kesişimleri (Golden/Death Cross) ve sıralaması yönü verir.",
            ],
            [
              "Trend Gücü & Rejim",
              "%25",
              "ADX(14), +DI / -DI",
              "ADX ≥ 25 güçlü trend (yön +DI/-DI'ye göre ±1); ADX 20-25 ılımlı (±0,5); ADX altında 20 yatay piyasa (0).",
            ],
            [
              "Momentum & Zamanlama",
              "%25",
              "MACD(12,26,9), RSI(14), Stokastik(14,3)",
              "MACD sinyal kesişimi; RSI altında 30 aşırı satım (+), üstünde 70 aşırı alım (-); Stokastik dipte/tepede kesişim. Güçlü trendde RSI/Stokastik uyarıları yumuşatılır (trendle uyumlu).",
            ],
            [
              "Hacim & Volatilite",
              "%15",
              "Hacim (20 dönem ort.), Bollinger(20,2)",
              "Ortalamanın 1,3 katı hacimle yükseliş (+) / düşüş (-). Fiyat alt bandın altında (+), üst bandın üstünde (-).",
            ],
          ]}
        />
        <Note>
          <strong>Dinamik risk:</strong> ATR(14) ile <strong>Stop-Loss = Fiyat - 1,5×ATR</strong> ve{" "}
          <strong>Kâr Al = Fiyat + 2,5×ATR</strong> önerilir (risk/kazanç ≈ 1,67). Bunu pozisyon takibinde
          başlangıç değeri olarak kullanabilirsiniz.
        </Note>
      </Section>

      <Section id="temel" title="5. Temel Analiz (şirket rasyoları)">
        <p>
          Rasyolar Yahoo Finance&apos;ten gelir. <strong>Bankalar ve finans şirketleri</strong> için ayrı eşik ve
          ağırlıklar kullanılır; çünkü mevduat borç sayıldığından Cari Oran ve Borç/Özkaynak bankalarda
          kullanılmaz (ağırlık 0).
        </p>
        <Table
          head={["Kategori", "Sanayi / Banka ağırlığı", "Rasyolar ve AL (+) eşiği", "Negatif (-) eşik"]}
          rows={[
            [
              "Kârlılık",
              "%35 / %45",
              "Net kâr marjı ≥ %10; Faaliyet marjı ≥ %15; ROE ≥ %15 (banka %20); ROA ≥ %5 (banka %1,8)",
              "Marj ≤ 0; ROE altında %5 (banka %10); ROA altında %1 (banka %0,8)",
            ],
            [
              "Değerleme",
              "%30 / %40",
              "PEG 0-1; F/K 0-15 (banka 0-7); PD/DD altında 1,5 (banka 0,9)",
              "PEG üstünde 2 veya negatif; F/K üstünde 30 (banka 12) veya negatif; PD/DD üstünde 4 (banka 1,8)",
            ],
            [
              "Mali Sağlamlık",
              "%25 / %0",
              "Cari oran ≥ 1,2; Borç/Özkaynak altında %100",
              "Cari oran altında 1,0; Borç/Özkaynak üstünde %200",
            ],
            [
              "Büyüme & Temettü",
              "%10 / %15",
              "Gelir büyümesi ≥ %10; Temettü verimi ≥ %2",
              "Gelir büyümesi negatif",
            ],
          ]}
        />
        <p>
          Verisi bulunamayan rasyo hesaba katılmaz; kalan kategorilerin ağırlıkları orantılı olarak yeniden
          dağıtılır. Hiç temel veri yoksa karar <strong>%100 teknik</strong> olur.
        </p>
      </Section>

      <Section id="karma" title="6. Karma Karar ve Periyoda Göre Ağırlık">
        <p>
          Kısa periyotta fiyatı bilanço değil likidite ve teknik hareket belirler; uzun periyotta şirketin temeli
          daha önemlidir. Bu yüzden teknik/temel ağırlığı periyoda göre değişir:
        </p>
        <Table
          head={["Periyot", "Teknik", "Temel"]}
          rows={[
            ["5dk, 10dk", "%95", "%5"],
            ["15dk, 30dk", "%90", "%10"],
            ["1 Saat, 2 Saat", "%80", "%20"],
            ["4 Saat", "%70", "%30"],
            ["Günlük", "%60", "%40"],
            ["Haftalık", "%45", "%55"],
            ["Aylık", "%35", "%65"],
          ]}
        />
        <p>
          <strong>Karma skor = Teknik ağırlık × Teknik skor + Temel ağırlık × Temel skor.</strong> Hisse detayında
          teknik ve temel sinyallerin uyumu da yorumlanır (ör. “Güçlü Uyum”, “Ayrışan Sinyal: Teknik AL / Temel
          Zayıf”). Ayrışan durumlarda yakın stop-loss ile takip önerilir.
        </p>
        <H3>Hangi periyodu seçmeliyim?</H3>
        <Table
          head={["Amaç", "Ana sinyal", "Trend filtresi", "Giriş zamanlaması"]}
          rows={[
            ["Gün içi", "15 dk", "1 saat", "5 dk"],
            ["2-3 gün", "1 saat", "4 saat", "15 dk"],
            ["~2 hafta (Swing)", "Günlük", "Haftalık", "4 saat"],
            ["1-3 ay", "Haftalık", "Aylık", "Günlük"],
          ]}
        />
        <p>
          Kısa periyotlar daha çok yanlış sinyal üretir; bireysel yatırımcı için komisyon ve spread nedeniyle 4 saat
          ve günlük periyotlar genellikle daha makuldür. Ayrıntı için <C>periyot-stratejileri.md</C> dosyasına
          bakın.
        </p>
      </Section>

      <Section id="ayarlar" title="7. Ekrandaki Ayarlar">
        <Table
          head={["Ayar", "Nerede", "Seçenekler", "Ne işe yarar / nerede saklanır"]}
          rows={[
            [
              "Analiz Periyodu",
              "Arama alanı, Lider Sinyaller, Takip Listesi",
              "5dk, 10dk, 15dk, 30dk, 1S, 2S, 4S, Günlük, Haftalık, Aylık",
              <span key="p">
                Her panel için ayrı seçilir; mum periyodunu ve teknik/temel ağırlığını belirler.{" "}
                <C>timeframe-settings.md</C>
              </span>,
            ],
            [
              "Endeks Tipi",
              "Çoklu Zaman Dilimi, Lider Sinyaller",
              "BIST 30 / BIST TÜM",
              <span key="i">
                Hangi hisse evreninin taranacağını seçer. BIST TÜM çok daha yavaştır. <C>endeks-tip.md</C>
              </span>,
            ],
            [
              "Veri Yenileme (otomatik)",
              "Lider Sinyaller, Çoklu Zaman, Takip Listesi",
              "15sn, 30sn, 1dk, 2dk, 5dk, Kapalı",
              <span key="r">
                Ekran verisinin kaç saniyede bir yenileneceğini ve sunucu önbellek süresini belirler. Yanındaki
                yenile düğmesi anında günceller. <C>refresh-settings.md</C>
              </span>,
            ],
            [
              "Mail Sıklığı",
              "Çoklu Zaman Dilimi başlığı",
              "5dk, 10dk, 15dk, 30dk, 1S, 2S, 4S, Günlük, Kapalı",
              <span key="m">
                Otomatik rapor e-postasının aralığı; “yalnızca seans içi” seçeneği ile birlikte çalışır.{" "}
                <C>mail-settings.md</C>
              </span>,
            ],
            [
              "Mail Alıcıları",
              "Çoklu Zaman Dilimi başlığı",
              "Adres ekle / sil / aktif-pasif",
              <span key="a">
                Raporların gideceği adresler. Varsayılan alıcı yoksa <C>MAIL_TO</C> kullanılır.{" "}
                <C>mail-recipients.md</C>
              </span>,
            ],
            [
              "Pozisyon kontrol aralığı",
              "Aktif Pozisyon Takibi",
              "1dk, 5dk, 15dk, 30dk, 1S, Kapalı",
              <span key="pp">
                Stop/hedef kontrolünün sıklığı ve yalnızca seans içi çalışma. <C>portfoy-takip.md</C>
              </span>,
            ],
          ]}
        />
        <Note>
          Ayar dosyaları proje klasöründe düz metin (.md) olarak durur; ekrandan yaptığınız değişiklik dosyaya
          yazılır, isterseniz dosyayı elle de düzenleyebilirsiniz.
        </Note>
        <H3>Sunucu ortam değişkenleri (.env.local)</H3>
        <ul className="list-disc space-y-1 pl-5">
          <li><C>GMAIL_USER</C> + <C>GMAIL_APP_PASSWORD</C>: Gmail ile gönderim (önerilen; Google uygulama şifresi gerekir).</li>
          <li><C>RESEND_API_KEY</C>: Alternatif gönderim yöntemi.</li>
          <li><C>MAIL_TO</C>: Varsayılan alıcı (boşsa gönderici adresi).</li>
          <li><C>CRON_SECRET</C>: Zamanlanmış sinyal-değişim görevi için gizli anahtar.</li>
          <li><C>APP_URL</C>: E-postalardaki bağlantıların adresi.</li>
          <li><C>KV_REST_API_URL / KV_REST_API_TOKEN</C>: İsteğe bağlı kalıcı depolama (yoksa bellek içi kullanılır).</li>
        </ul>
      </Section>

      <Section id="mail" title="8. E-Posta Bildirimleri">
        <p>Uygulamada <strong>üç tür</strong> otomatik e-posta vardır. Diğer bölümler (arama, Lider Sinyaller, Takip Listem) e-posta göndermez.</p>
        <Table
          head={["Bölüm", "E-posta içeriği", "Neye göre gelir?", "Sıklık"]}
          rows={[
            [
              <strong key="1">③ Çoklu Zaman Dilimi Sinyalleri</strong>,
              "“BIST Çoklu Zaman Dilimi AL/SAT Raporu”: 10 periyodun her biri için AL ve SAT veren hisseler (skorlarıyla).",
              "Seçili endeksteki tüm hisseler taranır; karma skor ≥ +0,28 ise AL, ≤ -0,28 ise SAT listelenir. Sinyal değişimi şart değildir, tarama anındaki durum raporlanır.",
              "Mail Sıklığı ayarına göre: 5/10/15/30 dk, 1/2/4 saat veya günde 1 kez (varsayılan 15 dk). Yalnızca seans içinde (Pzt-Cum 09:50-18:00). Kapalı seçilirse otomatik gelmez. “Şimdi Tara & Mail Gönder” ile her an elle gönderilir.",
            ],
            [
              <strong key="2">② Aktif Pozisyon Takibi</strong>,
              "“Stop-Loss Alarmı” veya “Kâr Al Hedefi Alarmı”: hisse, giriş/güncel fiyat, kâr-zarar %, stop ve hedef.",
              "Güncel fiyat Stop-Loss seviyesine eşit/altına inerse veya Kâr Al seviyesine eşit/üstüne çıkarsa. Her pozisyon için olay başına bir kez gönderilir; sonra pozisyon durumu değişir.",
              "Pozisyon kontrol aralığına göre (varsayılan 5 dk; 1dk-1S arası seçilebilir). Varsayılan olarak yalnızca seans içinde.",
            ],
            [
              <strong key="3">⑥ Takip Listesi (İzleme)</strong>,
              "“Sinyal Değişimi: THYAO AL, ...”: sinyali değişen hisseler, skor, fiyat ve nedenler.",
              "Takip listesindeki hisselerin sinyali bir önceki kontrole göre değiştiyse (ilk kayıt hariç). Gönderilemezse bir sonraki çalıştırmada yeniden denenir.",
              "Zamanlanmış görev (Vercel Cron): Pazartesi-Cuma günde 2 kez, 15:30 ve 20:30 UTC (Türkiye saatiyle 18:30 ve 23:30). Yalnızca Vercel dağıtımında ve CRON_SECRET tanımlıyken çalışır.",
            ],
          ]}
        />
        <Note>
          <strong>Önemli:</strong> Çoklu Zaman Dilimi ve Pozisyon e-postaları, uygulama sunucusunun{" "}
          <strong>çalışır durumda</strong> olmasına bağlıdır (her 30 saniyede bir zamanlayıcı kontrol eder). Bilgisayar
          kapalıysa veya uygulama durmuşsa bu e-postalar gönderilmez. Alıcılar Mail Alıcıları ekranındaki{" "}
          <strong>aktif</strong> adreslerdir.
        </Note>
        <H3>E-posta gelmiyorsa</H3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mail Sıklığı “Kapalı” olmasın.</li>
          <li>Seans dışındaysanız (hafta sonu, 09:50 öncesi, 18:00 sonrası) otomatik gönderim beklenir; elle gönderim çalışır.</li>
          <li><C>.env.local</C> içinde Gmail uygulama şifresi veya Resend anahtarı tanımlı olmalı.</li>
          <li>Mail Alıcıları içinde en az bir aktif adres olmalı; Spam klasörünü de kontrol edin.</li>
        </ul>
      </Section>

      <Section id="ipuclari" title="9. İpuçları ve Uyarılar">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Tek bir sinyale değil, <strong>teknik + temel uyumuna</strong> ve birden fazla periyodun aynı yönde olmasına bakın.</li>
          <li>Yatay piyasada (ADX altında 20) trend göstergeleri yanıltabilir; osilatörlere daha çok dikkat edin.</li>
          <li>Pozisyon açarken ATR bazlı Stop-Loss / Kâr Al önerisini başlangıç noktası olarak kullanın.</li>
          <li>BIST TÜM taraması yüzlerce hisse için çok sayıda veri çektiğinden yavaştır; günlük kullanım için BIST 30 önerilir.</li>
          <li>Veriler Yahoo Finance kaynaklıdır; gecikme ve eksik temel veri olabilir.</li>
        </ul>
        <Note tone="warn">Bu içerik eğitim amaçlıdır, yatırım tavsiyesi değildir.</Note>
      </Section>
    </div>
  );
}

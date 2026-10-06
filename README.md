# Finans Asistanı

Takip listesindeki varlıkları (BIST/global hisse + altın) her gün aynı kurallarla analiz eden, sonucu grafikle gösteren ve sinyal **değiştiğinde** e-posta ile bildiren Next.js (App Router) + TypeScript uygulaması.

> **Uyarı:** Bu sistem karar destek aracıdır, yatırım tavsiyesi değildir. Sinyaller geçmiş veriye dayanır, kâr garantisi yoktur.

Kaynak doküman: [Finans Asistanı_ SOP ve MVP.md](./Finans%20Asistan%C4%B1_%20SOP%20ve%20MVP.md)

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev
```

`.env.local`:

```
RESEND_API_KEY=...
MAIL_TO=senin@mail.com
CRON_SECRET=uzun-rastgele-bir-metin
APP_URL=https://senin-alan-adin.com
```

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `RESEND_API_KEY` | Hayır | Yoksa e-posta atlanır, analiz çalışmaya devam eder |
| `MAIL_TO` | Hayır | Sinyal e-postasının alıcısı |
| `CRON_SECRET` | Evet | `/api/cron` için `Bearer` token'ı |
| `APP_URL` | Hayır | E-postadaki "Uygulamada aç" linki (varsayılan `http://localhost:3000`) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Hayır | Vercel KV / Upstash Redis; yoksa bellek içi depolama |

## Komutlar

```bash
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi
npm run lint     # eslint
npx tsc --noEmit # tip denetimi
```

## Klasör yapısı

```
app/
├─ page.tsx                  # takip listesi tablosu
├─ symbol/[ticker]/page.tsx  # grafik + detay sayfası
└─ api/
   ├─ analyze/route.ts       # tek sembol analizi (UI bunu çağırır)
   └─ cron/route.ts          # tüm liste analizi + sinyal değişimi + mail
lib/
├─ watchlist.ts              # takip listesi tipleri ve yardımcıları
├─ watchlist-storage.ts      # watchlist.md okuma/yazma motoru
├─ timeframe-settings-storage.ts # timeframe-settings.md okuma/yazma ve periyot motoru
├─ mail-settings-storage.ts  # mail-settings.md okuma/yazma ve sıklık motoru
├─ refresh-settings-storage.ts # refresh-settings.md okuma/yazma ve önbellek TTL motoru
├─ refresh-settings-types.ts # veri yenileme tipleri ve seçenekleri
├─ scheduler.ts              # zamanlayıcı ve periyodik mail motoru
├─ data.ts                   # fiyat + temel veri (yahoo-finance2)
├─ indicators.ts             # RSI, MACD, SMA, Bollinger
├─ scoring.ts                # teknik/temel skor ve nihai sinyal
├─ analyze.ts                # tek sembol analiz akışı (her iki route da kullanır)
├─ store.ts                  # önceki sinyal + bekleyen mail (KV / bellek)
├─ mail.ts                   # e-posta gönderim motoru (Gmail / Resend)
├─ types.ts, format.ts
watchlist.md                 # dinamik takip listesi dosyası (Markdown tablosu)
timeframe-settings.md        # takip listesi ve lider sinyaller analiz periyotları (1s, 2s, 4s, 1d, 1wk, 1mo)
mail-settings.md             # e-posta bildirim sıklığı ayar dosyası (5dk, 10dk, 1 saat, günlük vb.)
refresh-settings.md          # ekran veri yenileme sıklığı ve önbellek TTL ayar dosyası (15sn, 30sn, 1dk vb.)
components/
├─ WatchlistTable.tsx        # ana sayfa tablosu
├─ SymbolDetail.tsx          # detay sayfası düzeni
├─ TimeframeSelector.tsx     # 1S, 2S, 4S, Günlük, 1H, 1A periyot seçici (.md senkronize)
├─ AutoRefreshControl.tsx    # ekrandan canlı veri yenileme sıklık seçici (.md senkronize)
├─ PriceChart.tsx            # mum + SMA50/200 + Bollinger
├─ IndicatorCharts.tsx       # RSI ve MACD panelleri
├─ SignalCard.tsx, SignalBadge.tsx
vercel.json                  # cron tanımları (UTC)
```

## Analiz kuralları (SOP §1.3)

- **Teknik (ağırlık %60, altın için %100):** RSI(14) 30/70 · MACD(12,26,9) kesişimi · SMA50/SMA200 golden-death cross (cross yoksa trend yönü ±0.5) · Bollinger(20,2) band dönüşü · Fiyat vs SMA200 → her gösterge +1/−1 (SMA trendi ±0.5), ortalama = teknik skor (−1..+1).
- **Temel (ağırlık %40, sadece hisse):** F/K, PD/DD, ROE, Borç/Özkaynak, Gelir büyümesi → ortalaması; veri yoksa `null` döner ve sistem otomatik olarak **sadece teknik skora** düşer.
- **Karar:** `0.6*t + 0.4*f >= 0.4 → AL`, `<= -0.4 → SAT`, aksi halde `TUT`. Altın: `skor = teknik`.
- **E-posta:** yalnızca sinyal değiştiğinde; gönderim başarısız olursa öğeler saklanır ve bir sonraki cron'da tekrar denenir.
- **Hata:** veri alınamayan sembol atlanır, loglanır, sinyali değiştirilmez.

## Cron (SOP §1.2)

`vercel.json` — UTC, TR = UTC+3:

| Zaman (TR) | Cron |
| --- | --- |
| 18:30 (BIST kapanışından sonra) | `30 15 * * 1-5` |
| 23:30 (ABD kapanışından sonra) | `30 20 * * 1-5` |

Vercel, `CRON_SECRET` tanımlıysa `Authorization: Bearer ...` başlığını otomatik gönderir. Elle test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://site.com/api/cron
```

## Yayına alma

1. GitHub'a yükle → Vercel'e bağla.
2. Vercel'de ortam değişkenlerini tanımla (`RESEND_API_KEY`, `MAIL_TO`, `CRON_SECRET`, `APP_URL`, KV anahtarları).
3. Resend'de gönderici adresini doğrula (alan adı yoksa test adresi yalnızca kendi mailine gönderir).
4. `/api/cron` adresini elle bir kez çağırıp e-postanın geldiğini doğrula.

## Bilinen sınırlar

- `yahoo-finance2` resmi bir API değildir, zaman zaman kırılabilir; BIST verisi gecikmeli gelebilir.
- Vercel ücretsiz planında cron sayısı ve sıklığı sınırlıdır.
- Eşikler (F/K 15/30, RSI 30/70, skor ±0.4) başlangıç değerleridir; sektör bazlı eşikler sonraki aşamada.
- KV yoksa sinyal geçmişi yalnızca sürecin belleğinde tutulur (sunucu yeniden başlarsa ilk çalıştırma "baseline" sayılır, e-posta gönderilmez).

## Yol haritası

Kullanıcı girişi ve kişisel takip listesi, backtest raporu, AI ile sinyal yorumu, Telegram bildirimi, portföy takibi, sektör bazlı temel analiz eşikleri.

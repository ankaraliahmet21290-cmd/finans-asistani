# Finans Asistanı · Warren Buffett & Kantitatif Hibrit Karar Modeli

Bu doküman, Finans Asistanı platformundaki **Teknik**, **Temel** ve **Karma (Hibrit)** karar destek sisteminin profesyonel algoritmik standartlara ve **Warren Buffett değer yatırımı** prensiplerine göre güncellenen mimarisini ve çalışma prensiplerini açıklamaktadır.

---

## 1. Model Felsefesi ve Yaklaşımı

> *"Piyasa kısa vadede bir oylama makinesidir (likidite ve fiyat hareketleri), uzun vadede ise bir tartı makinesidir (özkaynak kârlılığı ve şirket değeri)."*  
> — **Benjamin Graham & Warren Buffett**

Geleneksel sistemlerdeki sabit ağırlıklı modeller (örneğin her periyotta sabit %60 Teknik / %40 Temel), farklı yatırım ufuklarına sahip trader ve yatırımcıların ihtiyaçlarını karşılayamaz:
* **Gün içi (Intraday / Scalping):** 5 veya 15 dakikalık mum grafiğinde şirketin 3 ayda bir açıklanan bilançosu yönü belirlemez; likidite, hacim ve momentum belirleyicidir.
* **Orta ve Uzun Vade (Swing / Yatırım):** Haftalık veya aylık grafiklerde fiyat eninde sonunda şirketin gerçek kârlılığına, özkaynak büyümesine ve çarpanlarına yakınsar.

Bu doğrultuda sistem, **zamana duyarlı dinamik ağırlıklandırma**, **sektöre duyarlı bilanço analizi** ve **trend rejimine duyarlı osilatör mekanizması** ile donatılmıştır.

---

## 2. Çözülen Kritik Filtreleme Hatası (Multi-Timeframe Bug Fix)

### Sorun
Eski mimaride `lib/multitimeframe.ts` dosyasındaki tarama fonksiyonu sadece **nihai hibrit sinyali** `AL` veya `SAT` olan hisseleri listeye alıyor, hibrit skoru `TUT` olanları tamamen eliyordu.
* Bir hissenin **Teknik puanı güçlü AL** (örneğin `+0.45`) olsa bile, temel verisi henüz dengeliyse (`0.0`), hibrit skor `0.27` seviyesinde kalıyor ve sinyal `TUT` oluyordu.
* Bu hisse elendiği için, kullanıcı arayüzde **"Sadece Teknik"** sekmesine tıkladığında teknikte harika AL veren hisseleri listede **göremiyordu**. Aynı durum **"Sadece Temel"** sekmesi için de geçerliydi.

### Çözüm
1. Arka planda taranan 30 hissenin tamamı `items` dizisi altında muhafaza edildi.
2. `components/TimeframeSignals.tsx` bileşeni artık `cat.items` havuzunu kullanarak seçili moda göre bağımsız filtreleme yapar:
   * **Karma Sinyaller:** Dinamik periyot ağırlığına göre hesaplanan genel AL/SAT sinyalleri.
   * **Sadece Teknik:** Hibrit skordan bağımsız olarak teknik indikatörlerde (`techSignal`) AL/SAT üreten tüm hisseler (`techScore` sıralı).
   * **Sadece Temel:** Teknik yönden bağımsız olarak bilanço rasyolarında (`fundSignal`) AL/SAT üreten tüm şirketler (`fundScore` sıralı).

---

## 3. Dinamik Zaman Dilimi Ağırlıklandırması (Timeframe-Adaptive Model)

Model, seçilen grafik periyoduna göre teknik ve temel analiz ağırlıklarını otomatik olarak dengeler:

| Periyot | İşlem Karakteristiği | Teknik Ağırlık | Temel Ağırlık | Finansal & Algoritmik Gerekçe |
| :--- | :--- | :---: | :---: | :--- |
| **5dk – 10dk** | Ultra Hızlı / Scalping | **%95** | **%5** | Çok kısa vadeli dalgalanmayı bilanço değil anlık emir akışı ve momentum belirler. |
| **15dk – 30dk** | Gün İçi Trend / Kırılım | **%90** | **%10** | Gün içi kırılımlarda teknik teyit esastır. |
| **1 Saat – 2 Saat** | Kısa Vade Dalga (Swing) | **%80** | **%20** | Teknik yön ağırlıklı, temel arka plan filtreleyici. |
| **4 Saat** | Gün İçi Ana Salınım | **%70** | **%30** | Seanslar arası geçiş ve kurumsal pozisyonlanma dengesi. |
| **Günlük (1G)** | Klasik Karar Destek | **%60** | **%40** | Standart swing trading dengesi. |
| **Haftalık (1H)** | Orta-Uzun Vade Trend | **%45** | **%55** | Değer odaklı; bilanço trendi fiyata üstün gelmeye başlar. |
| **Aylık (1A)** | Warren Buffett Portföy | **%35** | **%65** | Özkaynak kârlılığı, ROE ve defter değeri ana getiri belirleyicisidir. |

---

## 4. Bankacılık & Finans Sektör Ayrıştırması (Warren Buffett Banka Kriterleri)

### Sanayi Körlüğü Problemi
Klasik temel analiz modelleri BIST bankalarını (GARAN, AKBNK, ISCTR, YKBNK vb.) sanayi şirketleri gibi değerlendirdiğinde:
* Bankaların mevduatları yasal bilançoda **"kısa vadeli borç"** olarak görünür.
* Bu sebeple Cari Oran hep `< 1.0` ve Borç/Özkaynak `> %800` çıkar.
* Standart bir sanayi modeli bankalara hatalı bir şekilde "iflas riski / likidite sıkışıklığı" teşhisi koyarak aşırı negatif puan veriyordu.

### Bankacılık Sektörü Kural Seti (`isFinancialOrBank`)
1. **Borç ve Likidite Rasyoları Devre Dışı (%0 Ağırlık):**  
   Mevduat toplama bankanın ana iş kolu olduğundan sanayi tipi Cari Oran ve Borç/Özkaynak rasyoları model dışı bırakıldı.
2. **Kârlılık & Verimlilik (%45 Ağırlık - Buffett Banka Motoru):**
   * **ROE (Özkaynak Kârlılığı):** Bankacılıkta en kritik metrik. `ROE > %20` mükemmel (`+1.3` ağırlık), `ROE < %10` zayıf.
   * **ROA (Aktif Kârlılığı):** Bankaların varlık yönetim kalitesi. `ROA > %1.8` bankacılık için çok güçlü.
3. **Değerleme Çarpanları (%40 Ağırlık):**
   * **F/K:** Bankalarda `2 – 7` arası iskontolu ve ucuz, `> 12` primli.
   * **PD/DD:** Bankalarda `< 0.9` defter değerine göre iskontolu, `> 1.8` primli.
4. **Büyüme & Temettü (%15 Ağırlık):**
   * Net kâr büyümesi ve temettü dağıtımı.

---

## 5. Trend Rejimine Duyarlı Osilatör Modeli (ADX vs RSI Düzeltmesi)

### RSI 70 Boğa Tuzağı Problemi
Güçlü bir boğa rallisi başladığında (fiyat dik açıyla yükselirken), RSI göstergesi hızla 70'in üzerine çıkar. Klasik modeller RSI > 70 gördüğü anda sisteme `-1 (SAT / Aşırı Alım)` puanı yazarak güçlü bir yükseliş trendini erken baltalar.

### Akıllı Trend Uyarlaması
Model, ADX (14) trend rejimi ile osilatörleri çapraz kontrol eder:
* **Güçlü Boğa Rejimi (ADX ≥ 25 ve +DI > -DI):**  
  RSI > 70 durumu satış değil, **kuvvetli momentum koşusu** olarak değerlendirilir. Satış cezası verilmez, momentum devamı puanı (`+0.2`) verilir.
* **Yatay / Testere Piyasa (ADX < 20):**  
  RSI > 70 durumu gerçek bir tepe direnci ve kâr satışı düzeltme uyarısıdır (`-1.0`).

---

## 6. Mimari ve Değiştirilen Kod Dosyaları

| Dosya | Yapılan Değişiklik |
| :--- | :--- |
| [`lib/bist.ts`](file:///c:/development/project/antigravity/finans-asistani/lib/bist.ts) | Banka ve finans kurumlarını tespit eden `isFinancialOrBank` dedektörü eklendi. |
| [`lib/scoring.ts`](file:///c:/development/project/antigravity/finans-asistani/lib/scoring.ts) | ADX rejimine duyarlı RSI/Stokastik, banka sektörüne özel `fundamentalScore(f, isBank)`, `getTimeframeWeights(tf, hasFund)`, periyoda duyarlı `finalSignal` ve `getHybridAssessment` fonksiyonları uygulandı. |
| [`lib/analyze.ts`](file:///c:/development/project/antigravity/finans-asistani/lib/analyze.ts) | Banka sektörü kontrolü ve seçilen periyot bilgisi skorlama motoruna bağlandı. |
| [`lib/multitimeframe.ts`](file:///c:/development/project/antigravity/finans-asistani/lib/multitimeframe.ts) | Taranan tüm 30 hisseyi saklayan `items` dizisi eklendi; önbellek ve tarama döngülerine banka analizi ve zaman dilimi ağırlığı entegre edildi. |
| [`components/TimeframeSignals.tsx`](file:///c:/development/project/antigravity/finans-asistani/components/TimeframeSignals.tsx) | "Sadece Teknik" ve "Sadece Temel" sekmelerinin filtrelenmemiş tam listeden beslenmesi sağlandı. |
| [`components/SymbolDetail.tsx`](file:///c:/development/project/antigravity/finans-asistani/components/SymbolDetail.tsx) | Model ağırlık dağılımı çubuğu ve açıklamaları seçilen zaman dilimine göre dinamik hale getirildi. |

---

## 7. Canlı Test ve Doğrulama Örnekleri

### Örnek 1: GARAN.IS (Garanti BBVA - Banka Sektörü)
* **Günlük (1G) Analiz:**
  * Eski Model: Borç/özkaynak ve cari oran cezası nedeniyle temel skor negatif baskı altındaydı.
  * Yeni Warren Buffett Modeli: **Temel Skor: +0.85 (Güçlü Temel Değer)**  
  * Sinyal: *Ayrışan Sinyal (Teknik SAT, Temel Ucuz) [Periyot Ağırlığı: %60 Teknik / %40 Temel]*  
  * Sonuç: Warren Buffett tarzı değerleme fırsatı; hisse temel olarak çok cazip ancak fiyatta teknik dönüş bekleniyor.
* **15 Dakikalık (15m) Analiz:**
  * Model Ağırlığı: **%90 Teknik / %10 Temel**
  * Sinyal: *Güçlü Uyum (Teknik & Temel AL)*
  * Sonuç: Kısa vadeli teknik kırılım gecikmesiz değerlendirildi.

### Örnek 2: Çoklu Zaman Dilimi Taraması
* **Sadece Teknik:** 5dk ve 15dk periyotlarında teknik kırılım yaşayan hisseler (örneğin 10 AL / 12 SAT) temel skordan bağımsız olarak eksiksiz listeleniyor.
* **Sadece Temel:** BIST 30 şirketlerinin gerçek kârlılık ve çarpanlarına göre değer sıralaması (19 AL / 2 SAT) sunuluyor.
* **Karma Sinyaller:** Seçilen periyodun ağırlık yapısına göre dengelenmiş nihai kararlar listeleniyor.

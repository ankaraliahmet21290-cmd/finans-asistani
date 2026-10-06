# E-Posta Gönderim Ayarları

Bu dosya Finans Asistanı otomatik e-posta gönderim sıklığını ve çalışma tercihlerini belirler.
Arayüz üzerinden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan bu dosya düzenlenerek de ayarlanabilir.

| Parametre | Değer | Açıklama |
| --- | --- | --- |
| Sıklık | günlük | Geçerli sıklık: 5m, 10m, 15m, 30m, 1h, 2h, 4h, daily, off |
| Görünen Ad | Günlük | Günde 1 kez |
| Dakika | 60 | Sayısal dakika karşılığı (0 = devre dışı, 1440 = günlük) |
| Aktif | Evet | Otomatik gönderim açık/kapalı |
| Yalnızca Seans İçi | Evet | 09:50 - 18:00 seans saatlerinde çalıştır |
| Son Güncelleme | 2026-10-06T06:10:58.202Z | Son güncelleme zamanı |

---

### Kullanılabilir Sıklık Seçenekleri:
- **5dk** (`5m`): Her 5 dakikada bir (Yüksek Sıklık)
- **10dk** (`10m`): Her 10 dakikada bir (Hızlı Takip)
- **15dk** (`15m`): Her 15 dakikada bir (Standart)
- **30dk** (`30m`): Her 30 dakikada bir (Dengeli)
- **1 saat** (`1h`): Her 1 saatte bir (Saatlik Özet)
- **2 saat** (`2h`): Her 2 saatte bir (2 Saatlik Özet)
- **4 saat** (`4h`): Her 4 saatte bir (Yarım Günlük)
- **günlük** (`daily`): Günde 1 kez seans saatlerinde
- **kapalı** (`off`): Otomatik gönderim kapalı (Yalnızca elle tarama)

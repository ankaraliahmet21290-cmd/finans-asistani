# Veri Yenileme Ayarları

Bu dosya Finans Asistanı ekranındaki piyasa verilerinin otomatik yenilenme sıklığını ve önbellek (cache) süresini belirler.
Arayüz üzerinden seçim yapıldığında bu dosya otomatik güncellenir veya doğrudan bu dosya elle düzenlenerek de ayarlanabilir.

| Parametre | Değer | Açıklama |
| --- | --- | --- |
| Sıklık | 30s | Geçerli yenileme aralığı: 15s, 30s, 60s, 120s, 300s, off |
| Görünen Ad | 30 sn | Önerilen (Hızlı & Dengeli) |
| Saniye | 30 | Sayısal saniye karşılığı (0 = kapalı) |
| Aktif | Evet | Otomatik veri yenileme açık/kapalı |
| Önbellek Süresi | 30 sn | Sunucu veri TTL süresi |
| Son Güncelleme | 2026-10-06T09:00:00.000Z | Son güncelleme zamanı |

---

### Kullanılabilir Yenileme Sıklığı Seçenekleri:
- **15 sn** (`15s` / `15`): Çok Hızlı (Gün içi anlık)
- **30 sn** (`30s` / `30`): Önerilen (Hızlı & Dengeli)
- **1 dk** (`60s` / `60` / `1m`): Standart Akış
- **2 dk** (`120s` / `120` / `2m`): Düşük Trafik
- **5 dk** (`300s` / `300` / `5m`): Tasarruflu
- **Kapalı** (`off` / `0`): Yalnızca Elle Yenileme

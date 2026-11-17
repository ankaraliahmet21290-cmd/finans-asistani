# Portföy Pozisyon Takibi & Alarm Masası

Bu dosya, aldığınız hisseleri, alış periyotlarını, dinamik Stop-Loss ve Kâr Al seviyelerini takip eder.
Fiyat Stop-Loss veya Kâr Al seviyesine ulaştığında otomatik e-posta alarmı gönderilir.

## Ayarlar
- **Genel Tarama Aralığı:** 5 dk
- **BIST Alarm Sıklığı:** 5m
- **Kripto Alarm Sıklığı:** 1m
- **Emtia & FX Alarm Sıklığı:** 5m
- **ABD Borsası Alarm Sıklığı:** 15m
- **Sadece Seans İçi:** Evet
- **Son Kontrol:** 2026-11-17T11:36:57.298Z
- **Son Alarm:** —

## Aktif Pozisyonlar

| Sembol | Kod | Periyot | Alış Fiyatı | Alış Tarihi | Stop-Loss | Kâr Al | Durum | Not |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| THYAO.IS | THYAO | 1h | 325.00 | 2026-11-17 | 321.15 | 331.41 | Aktif |  |

> **Nasıl Çalışır?**
> 1. Sayfadan hisse eklediğinizde veya periyot seçtiğinizde bu dosyaya otomatik satır eklenir.
> 2. Belirlediğiniz tarama aralığında hisselerin güncel fiyatları kontrol edilir.
> 3. Fiyat Stop-Loss seviyesinin altına indiğinde veya Kâr Al hedefine ulaştığında bildirim e-postası gönderilir.

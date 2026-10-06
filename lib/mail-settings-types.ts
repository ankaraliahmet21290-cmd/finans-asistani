export type MailIntervalKey =
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "daily"
  | "off";

export interface MailIntervalOption {
  key: MailIntervalKey;
  minutes: number;
  label: string;
  emailLabel: string;
  desc: string;
  badge: string;
}

export const MAIL_INTERVAL_OPTIONS: MailIntervalOption[] = [
  {
    key: "5m",
    minutes: 5,
    label: "5 dk",
    emailLabel: "5 Dakikalık",
    desc: "Çok Sık (Gün içi anlık takip)",
    badge: "5 DK",
  },
  {
    key: "10m",
    minutes: 10,
    label: "10 dk",
    emailLabel: "10 Dakikalık",
    desc: "Hızlı seans içi takip",
    badge: "10 DK",
  },
  {
    key: "15m",
    minutes: 15,
    label: "15 dk",
    emailLabel: "15 Dakikalık",
    desc: "Standart seans içi tarama",
    badge: "15 DK",
  },
  {
    key: "30m",
    minutes: 30,
    label: "30 dk",
    emailLabel: "30 Dakikalık",
    desc: "Dengeli aralık",
    badge: "30 DK",
  },
  {
    key: "1h",
    minutes: 60,
    label: "1 saat",
    emailLabel: "1 Saatlik",
    desc: "Saat başı düzenli özet",
    badge: "1 SAAT",
  },
  {
    key: "2h",
    minutes: 120,
    label: "2 saat",
    emailLabel: "2 Saatlik",
    desc: "2 saatlik seans özeti",
    badge: "2 SAAT",
  },
  {
    key: "4h",
    minutes: 240,
    label: "4 saat",
    emailLabel: "4 Saatlik",
    desc: "Yarım günlük özet",
    badge: "4 SAAT",
  },
  {
    key: "daily",
    minutes: 1440,
    label: "Günlük",
    emailLabel: "Günlük",
    desc: "Günde 1 kez (Her seans günü)",
    badge: "GÜNLÜK",
  },
  {
    key: "off",
    minutes: 0,
    label: "Kapalı",
    emailLabel: "Devre Dışı",
    desc: "Otomatik e-posta gönderimini durdur",
    badge: "KAPALI",
  },
];

export interface MailScheduleConfig {
  intervalKey: MailIntervalKey;
  intervalMinutes: number;
  label: string;
  emailLabel: string;
  description: string;
  enabled: boolean;
  onlyTradingHours: boolean;
  updatedAt: string;
}

export const DEFAULT_MAIL_SETTINGS: MailScheduleConfig = {
  intervalKey: "15m",
  intervalMinutes: 15,
  label: "15 dk",
  emailLabel: "15 Dakikalık",
  description: "Standart seans içi tarama",
  enabled: true,
  onlyTradingHours: true,
  updatedAt: new Date().toISOString(),
};

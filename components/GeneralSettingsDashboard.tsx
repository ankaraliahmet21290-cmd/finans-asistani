"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { MailRecipient, MarketScope, NotificationType } from "@/lib/mail-recipients-types";
import {
  MAIL_INTERVAL_OPTIONS,
  type MailIntervalKey,
  type MailIntervalOption,
  type MailScheduleConfig,
} from "@/lib/mail-settings-types";
import { REFRESH_INTERVAL_OPTIONS, type RefreshInterval } from "@/lib/refresh-settings-types";

const VALID_CRYPTO_CATEGORIES: Record<string, string> = {
  major: "🔥 Liderler",
  all: "🌐 Tümü",
  layer1: "⚡ Ana Ağlar (Layer 1)",
  layer2: "🚀 Hızlandırma & Rollup (Layer 2)",
  ai: "🤖 Yapay Zeka (AI)",
  defi: "🏦 DeFi & Finans",
  meme: "🐕 Meme Coinler",
  gaming: "🎮 Web3 & Oyun",
  infra: "🔒 Altyapı & Gizlilik",
};

interface MailSettingsResponse {
  ok: boolean;
  config: MailScheduleConfig;
  options: MailIntervalOption[];
  scheduler: {
    initialized: boolean;
    intervalMinutes: number;
    intervalKey: MailIntervalKey;
    intervalLabel: string;
    lastMailedAt: string | null;
    lastStatus: string | null;
    isWithinHours: boolean;
  };
  mail: {
    configured: boolean;
    provider: string | null;
    recipient: string | null;
    activeRecipientsCount?: number;
    totalRecipientsCount?: number;
    activeEmails?: string[];
  };
}

const MARKET_DEFINITIONS: Array<{ id: MarketScope; label: string; icon: string; desc: string }> = [
  { id: "bist", label: "BIST", icon: "🇹🇷", desc: "Borsa İstanbul Pay Piyasası" },
  { id: "crypto", label: "Kripto", icon: "🪙", desc: "Tüm Kripto Varlıklar (7/24)" },
  { id: "commodity_forex", label: "Emtia & FX", icon: "🥇", desc: "Altın, Gümüş, Petrol, Döviz" },
  { id: "us_stocks", label: "ABD Borsası", icon: "🇺🇸", desc: "Nasdaq & S&P 500 Varlıkları" },
];

export default function GeneralSettingsDashboard() {
  // Data states
  const [recipients, setRecipients] = useState<MailRecipient[]>([]);
  const [mailSettings, setMailSettings] = useState<MailSettingsResponse | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [marketRefresh, setMarketRefresh] = useState<{
    bist: number;
    crypto: number;
    commodity_forex: number;
    us_stocks: number;
  }>({
    bist: 30,
    crypto: 15,
    commodity_forex: 60,
    us_stocks: 30,
  });
  const [cryptoCategory, setCryptoCategory] = useState<string>("major");

  // Loading & action states
  const [loading, setLoading] = useState<boolean>(true);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");

  // New recipient form state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newFrequency, setNewFrequency] = useState<MailIntervalKey>("15m");
  const [newNotifyReports, setNewNotifyReports] = useState<boolean>(true);
  const [newNotifyPositions, setNewNotifyPositions] = useState<boolean>(true);
  const [newNotifyWatchlist, setNewNotifyWatchlist] = useState<boolean>(true);
  const [newMarkets, setNewMarkets] = useState<MarketScope[]>([
    "bist",
    "crypto",
    "commodity_forex",
    "us_stocks",
  ]);

  // Load all initial settings
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [recipientsRes, mailRes, refreshRes, cryptoRes] = await Promise.all([
        fetch("/api/mail/recipients", { cache: "no-store" }),
        fetch("/api/mail/settings", { cache: "no-store" }),
        fetch("/api/settings/refresh", { cache: "no-store" }),
        fetch("/api/settings/crypto", { cache: "no-store" }),
      ]);

      if (recipientsRes.ok) {
        const data = await recipientsRes.json();
        setRecipients(data.recipients || []);
      }
      if (mailRes.ok) {
        const data = await mailRes.json();
        setMailSettings(data);
      }
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.config?.seconds) {
          setRefreshInterval(data.config.seconds);
        }
        if (data.config?.markets) {
          setMarketRefresh(data.config.markets);
        }
      }
      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        if (data.settings?.defaultCategory) {
          setCryptoCategory(data.settings.defaultCategory);
        }
      }
    } catch (err) {
      console.error("[GeneralSettings] Yükleme hatası:", err);
      setFeedback({ text: "Ayarlar yüklenirken bir hata oluştu.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Auto clear feedback after 6s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Add recipient handler
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setFeedback({ text: "Lütfen geçerli bir e-posta adresi yazın.", type: "error" });
      return;
    }

    if (newMarkets.length === 0) {
      setFeedback({ text: "Lütfen alıcı için en az bir piyasa seçin.", type: "error" });
      return;
    }

    if (!newNotifyReports && !newNotifyPositions && !newNotifyWatchlist) {
      setFeedback({ text: "Lütfen alıcı için en az bir bildirim türü seçin.", type: "error" });
      return;
    }

    setSavingAction("add");
    try {
      const res = await fetch("/api/mail/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: newName.trim() || undefined,
          intervalKey: newFrequency,
          enabled: true,
          notifyReports: newNotifyReports,
          notifyPositions: newNotifyPositions,
          notifyWatchlist: newNotifyWatchlist,
          markets: newMarkets,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients || []);
        setNewEmail("");
        setNewName("");
        setIsAddOpen(false);
        setFeedback({
          text: `✓ "${email}" başarıyla alıcı listesine eklendi ve ayarları kaydedildi.`,
          type: "success",
        });
      } else {
        setFeedback({ text: data.error || "Alıcı eklenemedi.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Sunucu bağlantı hatası oluştu.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Update recipient helper (PATCH)
  const patchRecipient = async (
    email: string,
    updates: Partial<MailRecipient>,
    successMessage?: string
  ) => {
    setSavingAction(email);
    try {
      const res = await fetch("/api/mail/recipients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...updates }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients || []);
        if (successMessage) {
          setFeedback({ text: successMessage, type: "success" });
        }
      } else {
        setFeedback({ text: data.error || "Güncelleme başarısız.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Güncelleme sırasında hata oluştu.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (email: string) => {
    if (!confirm(`"${email}" alıcısını listeden kaldırmak istediğinizden emin misiniz?`)) {
      return;
    }
    setSavingAction(`del-${email}`);
    try {
      const res = await fetch("/api/mail/recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients || []);
        setFeedback({
          text: `✓ "${email}" alıcı listesinden kaldırıldı.`,
          type: "info",
        });
      } else {
        setFeedback({ text: data.error || "Silme başarısız.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Silme işlemi sırasında hata oluştu.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Send test email
  const handleSendTestMail = async (email?: string) => {
    const targetLabel = email ? `"${email}"` : "tüm aktif alıcılara";
    setTestingEmail(email ?? "all");
    try {
      const url = email ? `/api/mail/test?email=${encodeURIComponent(email)}` : `/api/mail/test`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setFeedback({
          text: `✓ Test e-postası ${targetLabel} başarıyla gönderildi! Gelen kutunuzu veya spam klasörünü kontrol edin.`,
          type: "success",
        });
      } else {
        setFeedback({
          text: `✕ Gönderim başarısız: ${data.error || "Bilinmeyen hata"}`,
          type: "error",
        });
      }
    } catch {
      setFeedback({ text: "Test maili gönderilirken bağlantı hatası oluştu.", type: "error" });
    } finally {
      setTestingEmail(null);
    }
  };

  // Save global mail schedule setting
  const handleGlobalScheduleChange = async (newKey: MailIntervalKey) => {
    setSavingAction("globalSchedule");
    try {
      const res = await fetch("/api/mail/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervalKey: newKey }),
      });
      const data = await res.json();
      if (data.ok) {
        setMailSettings((prev) => (prev ? { ...prev, config: data.config, scheduler: data.scheduler } : null));
        setFeedback({
          text: `✓ Genel tarama sıklığı "${newKey}" olarak güncellendi ve kaydedildi.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Ayar kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Save onlyTradingHours setting
  const handleToggleOnlyTradingHours = async () => {
    if (!mailSettings) return;
    const nextVal = !mailSettings.config.onlyTradingHours;
    setSavingAction("tradingHours");
    try {
      const res = await fetch("/api/mail/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyTradingHours: nextVal }),
      });
      const data = await res.json();
      if (data.ok) {
        setMailSettings((prev) => (prev ? { ...prev, config: data.config, scheduler: data.scheduler } : null));
        setFeedback({
          text: `✓ Seans saatleri kuralı güncellendi: ${nextVal ? "Sadece seans saatlerinde gönderilir" : "Her zaman (7/24) gönderilir"}.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Ayar kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Save refresh interval setting
  const handleRefreshChange = async (seconds: number) => {
    setSavingAction("refresh");
    try {
      const res = await fetch("/api/settings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      const data = await res.json();
      if (data.ok) {
        setRefreshInterval(seconds);
        setFeedback({
          text: `✓ Veri yenileme sıklığı "${seconds} saniye" olarak güncellendi.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Ayar kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Save crypto default category
  const handleCryptoCategoryChange = async (cat: string) => {
    setSavingAction("cryptoCat");
    try {
      const res = await fetch("/api/settings/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (data.ok) {
        setCryptoCategory(cat);
        setFeedback({
          text: `✓ Kripto ekranı varsayılan sekmesi "${VALID_CRYPTO_CATEGORIES[cat] || cat}" olarak kaydedildi.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Kripto ayarı kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Save market-specific scan interval
  const handleMarketScanIntervalChange = async (market: MarketScope, intervalKey: MailIntervalKey) => {
    setSavingAction(`scan-${market}`);
    try {
      const res = await fetch("/api/mail/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, intervalKey }),
      });
      const data = await res.json();
      if (data.ok) {
        setMailSettings((prev) => (prev ? { ...prev, config: data.config, scheduler: data.scheduler } : null));
        const mObj = MARKET_DEFINITIONS.find((m) => m.id === market);
        setFeedback({
          text: `✓ ${mObj?.label || market} tarama sıklığı "${intervalKey}" olarak güncellendi ve kaydedildi.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Tarama sıklığı kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Save market-specific live refresh interval
  const handleMarketRefreshIntervalChange = async (market: MarketScope, seconds: number) => {
    setSavingAction(`ref-${market}`);
    try {
      const res = await fetch("/api/settings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, seconds }),
      });
      const data = await res.json();
      if (data.ok) {
        setMarketRefresh((prev) => ({ ...prev, [market]: seconds }));
        const mObj = MARKET_DEFINITIONS.find((m) => m.id === market);
        setFeedback({
          text: `✓ ${mObj?.label || market} canlı yenileme sıklığı "${seconds} sn" olarak güncellendi ve kaydedildi.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Yenileme sıklığı kaydedilemedi.", type: "error" });
    } finally {
      setSavingAction(null);
    }
  };

  // Clear data cache
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await fetch("/api/cache/clear", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setFeedback({
          text: "✓ Tüm fiyat, mum ve temel analiz önbelleği başarıyla temizlendi. İlk isteklerde güncel veriler çekilecek.",
          type: "success",
        });
      } else {
        setFeedback({ text: data.error || "Önbellek temizlenemedi.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Önbellek temizlenirken hata oluştu.", type: "error" });
    } finally {
      setClearingCache(false);
    }
  };

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEmail = r.email.toLowerCase().includes(q);
        const matchName = r.name?.toLowerCase().includes(q);
        if (!matchEmail && !matchName) return false;
      }
      // Status
      if (statusFilter === "active" && !r.enabled) return false;
      if (statusFilter === "inactive" && r.enabled) return false;
      // Type
      if (typeFilter === "reports" && !r.notifyReports) return false;
      if (typeFilter === "positions" && !r.notifyPositions) return false;
      if (typeFilter === "watchlist" && !r.notifyWatchlist) return false;
      return true;
    });
  }, [recipients, searchQuery, statusFilter, typeFilter]);

  const activeRecipientsCount = recipients.filter((r) => r.enabled).length;

  return (
    <div className="space-y-8">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/50 bg-emerald-950/80 text-emerald-200 shadow-emerald-950/30"
              : feedback.type === "error"
              ? "border-rose-500/50 bg-rose-950/80 text-rose-200 shadow-rose-950/30"
              : "border-sky-500/50 bg-sky-950/80 text-sky-200 shadow-sky-950/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✅" : feedback.type === "error" ? "⚠️" : "ℹ️"}</span>
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Hero / Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mail Provider Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Mail Servisi</span>
            <span className="text-base">✉️</span>
          </div>
          <div className="flex items-center gap-2">
            {mailSettings?.mail.configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {mailSettings.mail.provider === "gmail" ? "Gmail SMTP Aktif" : "Resend API Aktif"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Yapılandırılmadı (.env)
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 truncate">
            {mailSettings?.mail.recipient ? `Varsayılan: ${mailSettings.mail.recipient}` : "Varsayılan alıcı bulunmuyor"}
          </p>
        </div>

        {/* Total & Active Recipients Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Kayıtlı Alıcılar</span>
            <span className="text-base">👥</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100">{activeRecipientsCount}</span>
            <span className="text-xs text-zinc-400 font-medium">aktif / {recipients.length} toplam</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {activeRecipientsCount > 0 ? "Filtrelenmiş bildirimler dağıtılıyor" : "Aktif alıcı eklenmeli"}
          </p>
        </div>

        {/* Global Scheduler Status */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Zamanlayıcı (Cron)</span>
            <span className="text-base">⏱️</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              {mailSettings?.config.intervalKey ? `${mailSettings.config.intervalKey} Periyodu` : "15m Aktif"}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {mailSettings?.scheduler.isWithinHours ? "🟢 Seans İçi Açık" : "⚪ Seans Dışı / Beklemede"}
          </p>
        </div>

        {/* Quick Test & Cache Clear Action Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Hızlı İşlemler</span>
            <span className="text-base">⚡</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendTestMail()}
              disabled={testingEmail !== null || activeRecipientsCount === 0}
              className="flex-1 rounded-xl border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95 disabled:opacity-50"
              title="Tüm aktif alıcılara örnek sinyal e-postası gönderir"
            >
              {testingEmail === "all" ? "Gönderiliyor..." : "✉️ Toplu Test"}
            </button>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
              title="Önbelleği temizle"
            >
              {clearingCache ? "..." : "🧹 Önbellek"}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">
            Alıcıları ve önbelleği doğrudan test edin
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: E-POSTA ALICILARI VE BİLDİRİM DAĞITIMI (PRIMARY FOCUS)         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/40 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-lg">
                📬
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-zinc-100">
                  E-Posta Alıcıları ve Bildirim Dağıtımı
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Hangi e-posta adresine hangi tür bildirimlerin (Raporlar, Portföy Alarmları, Takip Listesi) ve hangi piyasaların gideceğini belirleyin.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen((prev) => !prev)}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/50 bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:opacity-95 active:scale-95"
          >
            <span>{isAddOpen ? "✕ Formu Gizle" : "+ Yeni Alıcı Ekle"}</span>
          </button>
        </div>

        {/* New Recipient Accordion / Form */}
        {isAddOpen && (
          <form
            onSubmit={handleAddRecipient}
            className="mt-6 rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/20 to-zinc-900/60 p-5 shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/60">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                ✨ Yeni E-Posta Alıcısı ve Bildirim Tercihleri Tanımla
              </span>
              <span className="text-[11px] text-zinc-400">
                Değişiklikler anında <code>mail-recipients.md</code> dosyasına işlenir.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Email */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  E-Posta Adresi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ornek@alanadi.com"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Name / Note */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  İsim / Departman / Not
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="örn: Ahmet (Finans Masası)"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Frequency */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Rapor Gönderim Sıklığı
                </label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as MailIntervalKey)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {MAIL_INTERVAL_OPTIONS.filter((o) => o.key !== "off").map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} ({opt.desc})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Types Selection */}
            <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                🔔 Gönderilecek Bildirim Türleri:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reports */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    newNotifyReports
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                      : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newNotifyReports}
                    onChange={(e) => setNewNotifyReports(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-sky-500 focus:ring-sky-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-100">📊 Çoklu Zaman Dilimi Raporları</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      10 periyotlu otomatik AL/SAT tarama sonuçları
                    </div>
                  </div>
                </label>

                {/* Positions */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    newNotifyPositions
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newNotifyPositions}
                    onChange={(e) => setNewNotifyPositions(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-100">🛑 Portföy Alarmları</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Stop-Loss ve Kâr Al hedefleri tetiklendiğinde
                    </div>
                  </div>
                </label>

                {/* Watchlist */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    newNotifyWatchlist
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                      : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newNotifyWatchlist}
                    onChange={(e) => setNewNotifyWatchlist(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-100">🔔 Takip Listesi Sinyalleri</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Favori varlıkların sinyal değişim uyarıları
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Market Scopes Selection */}
            <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                🌐 İlgilendiği Piyasalar:
              </label>
              <div className="flex flex-wrap gap-2">
                {MARKET_DEFINITIONS.map((m) => {
                  const isSelected = newMarkets.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        setNewMarkets((prev) =>
                          isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? "border-sky-500/60 bg-sky-500/20 text-sky-200 shadow-sm shadow-sky-500/20"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                      <span className="text-[10px] opacity-70">({m.desc})</span>
                      <span className="ml-1 text-xs">{isSelected ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={savingAction === "add"}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition"
              >
                <span>{savingAction === "add" ? "Kaydediliyor..." : "✓ Alıcıyı Listeye Ekle ve Kaydet"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800/60">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Alıcı e-posta veya ismiyle filtrele..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                statusFilter === "all"
                  ? "bg-zinc-800 text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tümü ({recipients.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                statusFilter === "active"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Aktifler ({activeRecipientsCount})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                statusFilter === "inactive"
                  ? "bg-zinc-800 text-zinc-300 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pasifler ({recipients.length - activeRecipientsCount})
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs border-t md:border-t-0 md:border-l border-zinc-800/80 pt-2 md:pt-0 md:pl-3">
            <span className="text-zinc-500 text-[11px]">Tür:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | NotificationType)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">Tüm Bildirimler</option>
              <option value="reports">📊 Rapor Alanlar</option>
              <option value="positions">🛑 Alarm Alanlar</option>
              <option value="watchlist">🔔 Sinyal Alanlar</option>
            </select>
          </div>
        </div>

        {/* Recipients Table / Cards */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Alıcı listesi yükleniyor...
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
              <p className="text-sm font-semibold text-zinc-400">Kayıtlı alıcı bulunamadı.</p>
              <p className="text-xs text-zinc-500 mt-1">
                Arama kriterinizi değiştirebilir veya yukarıdaki formdan yeni alıcı ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            filteredRecipients.map((r) => {
              const isUpdating = savingAction === r.email;
              const isTestingThis = testingEmail === r.email;

              return (
                <div
                  key={r.email}
                  className={`group relative rounded-2xl border p-4 sm:p-5 transition-all ${
                    r.enabled
                      ? "border-zinc-800/90 bg-zinc-900/50 hover:border-zinc-700/80"
                      : "border-zinc-800/40 bg-zinc-950/40 opacity-70 hover:opacity-90"
                  } ${isUpdating ? "ring-1 ring-sky-500/50" : ""}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Email, Name, Status Badge */}
                    <div className="flex items-start gap-3 min-w-[240px]">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() =>
                          patchRecipient(
                            r.email,
                            { enabled: !r.enabled },
                            `"${r.email}" durumu ${!r.enabled ? "Aktif" : "Pasif"} olarak güncellendi.`
                          )
                        }
                        className={`mt-1 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                          r.enabled ? "bg-emerald-500" : "bg-zinc-700"
                        }`}
                        title={r.enabled ? "Pasife al" : "Aktife al"}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                            r.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-bold text-zinc-100">
                            {r.email}
                          </span>
                          {r.enabled ? (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-semibold text-emerald-400">
                              Aktif
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.2 text-[10px] font-semibold text-zinc-400">
                              Pasif
                            </span>
                          )}
                        </div>
                        {r.name && (
                          <p className="text-xs text-zinc-400 font-medium">{r.name}</p>
                        )}
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Eklendi: {r.addedAt}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Frequency dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-400 shrink-0">Sıklık:</span>
                      <select
                        value={r.intervalKey}
                        onChange={(e) =>
                          patchRecipient(
                            r.email,
                            { intervalKey: e.target.value as MailIntervalKey },
                            `"${r.email}" gönderim sıklığı "${e.target.value}" yapıldı.`
                          )
                        }
                        className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                      >
                        {MAIL_INTERVAL_OPTIONS.filter((o) => o.key !== "off").map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notification Types Toggle Buttons */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        Bildirim Türleri
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Reports */}
                        <button
                          type="button"
                          onClick={() =>
                            patchRecipient(
                              r.email,
                              { notifyReports: !r.notifyReports },
                              `"${r.email}" için Rapor bildirimleri ${!r.notifyReports ? "açıldı" : "kapatıldı"}.`
                            )
                          }
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            r.notifyReports
                              ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-600 line-through hover:border-zinc-700"
                          }`}
                          title="Çoklu zaman dilimi rapor bildirimleri"
                        >
                          📊 Raporlar
                        </button>

                        {/* Positions */}
                        <button
                          type="button"
                          onClick={() =>
                            patchRecipient(
                              r.email,
                              { notifyPositions: !r.notifyPositions },
                              `"${r.email}" için Portföy alarmları ${!r.notifyPositions ? "açıldı" : "kapatıldı"}.`
                            )
                          }
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            r.notifyPositions
                              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-600 line-through hover:border-zinc-700"
                          }`}
                          title="Portföy Stop-Loss ve Kâr Al alarmları"
                        >
                          🛑 Stop/Kâr Al
                        </button>

                        {/* Watchlist */}
                        <button
                          type="button"
                          onClick={() =>
                            patchRecipient(
                              r.email,
                              { notifyWatchlist: !r.notifyWatchlist },
                              `"${r.email}" için Takip Listesi sinyalleri ${!r.notifyWatchlist ? "açıldı" : "kapatıldı"}.`
                            )
                          }
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            r.notifyWatchlist
                              ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-600 line-through hover:border-zinc-700"
                          }`}
                          title="Takip Listesi sinyal değişim uyarıları"
                        >
                          🔔 Takip Sinyali
                        </button>
                      </div>
                    </div>

                    {/* Market Scopes Toggle Pills */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        Piyasalar
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {MARKET_DEFINITIONS.map((m) => {
                          const hasMarket = (r.markets || []).includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const current = r.markets || [];
                                const updated = hasMarket
                                  ? current.filter((x) => x !== m.id)
                                  : [...current, m.id];
                                if (updated.length === 0) {
                                  setFeedback({
                                    text: "Alıcının en az 1 piyasaya bağlı olması gerekir.",
                                    type: "error",
                                  });
                                  return;
                                }
                                patchRecipient(
                                  r.email,
                                  { markets: updated },
                                  `"${r.email}" için ${m.label} piyasası ${!hasMarket ? "açıldı" : "kapatıldı"}.`
                                );
                              }}
                              className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition ${
                                hasMarket
                                  ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
                                  : "border-zinc-800/80 bg-zinc-950/40 text-zinc-600 hover:border-zinc-700"
                              }`}
                              title={m.desc}
                            >
                              <span>{m.icon}</span> <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => handleSendTestMail(r.email)}
                        disabled={isTestingThis || !r.enabled}
                        className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 active:scale-95 disabled:opacity-40 transition"
                        title={`Yalnızca ${r.email} adresine test maili gönder`}
                      >
                        {isTestingThis ? "Gönderiliyor..." : "✉️ Test"}
                      </button>

                      <button
                        onClick={() => handleDeleteRecipient(r.email)}
                        disabled={savingAction === `del-${r.email}`}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 active:scale-95 disabled:opacity-40 transition"
                        title="Alıcıyı sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PİYASA BAZLI BAĞIMSIZ TARAMA & YENİLEME SIKLIKLARI             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/40 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-zinc-800/80 pb-4 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-lg">
            🎛️
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-zinc-100">
              Piyasa Bazlı Bağımsız Tarama & Yenileme Sıklıkları
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Her piyasanın (BIST, Kripto, Emtia/Döviz, ABD) seans dinamiklerine göre otomatik bülten tarama ve canlı veri yenileme sürelerini birbirinden bağımsız belirleyin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MARKET_DEFINITIONS.map((m) => {
            const currentScanKey =
              mailSettings?.config.markets?.[m.id] ||
              (m.id === "crypto" ? "5m" : m.id === "us_stocks" ? "30m" : "15m");
            const currentRefreshSec = marketRefresh[m.id] ?? (m.id === "crypto" ? 15 : m.id === "commodity_forex" ? 60 : 30);
            const isSavingScan = savingAction === `scan-${m.id}`;
            const isSavingRef = savingAction === `ref-${m.id}`;

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/60 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-zinc-100">{m.label}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[130px]">{m.desc}</div>
                      </div>
                    </div>
                    {m.id === "crypto" ? (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        7/24 Açık
                      </span>
                    ) : m.id === "us_stocks" ? (
                      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                        16:30-23:00
                      </span>
                    ) : m.id === "commodity_forex" ? (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        Hafta İçi 24S
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
                        09:50-18:00
                      </span>
                    )}
                  </div>

                  {/* 1. Tarama Sıklığı (Mail Bülteni) */}
                  <div className="space-y-1.5 mb-3.5">
                    <label className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <span>⏱️</span>
                        <span>Bülten Tarama:</span>
                      </span>
                      {isSavingScan && <span className="text-[10px] text-sky-400 animate-pulse">...</span>}
                    </label>
                    <select
                      value={currentScanKey}
                      onChange={(e) => handleMarketScanIntervalChange(m.id, e.target.value as MailIntervalKey)}
                      disabled={isSavingScan}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 font-semibold focus:border-sky-500 focus:outline-none"
                    >
                      {MAIL_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.desc})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500">
                      Arka plan çoklu periyot AL/SAT bülteni
                    </p>
                  </div>

                  {/* 2. Canlı Yenileme Sıklığı (Arayüz) */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Canlı Veri Yenileme:</span>
                      </span>
                      {isSavingRef && <span className="text-[10px] text-amber-400 animate-pulse">...</span>}
                    </label>
                    <select
                      value={currentRefreshSec}
                      onChange={(e) => handleMarketRefreshIntervalChange(m.id, Number(e.target.value))}
                      disabled={isSavingRef}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {REFRESH_INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.desc})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500">
                      Ekranda canlı fiyat & tablo güncellemesi
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 pt-2 border-t border-zinc-800/40 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>Ayrı kaydedilir</span>
                  <span className="text-emerald-400">✓ Bağımsız</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: SISTEM & GENEL VARSAYILANLAR                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduler & Session Card */}
        <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-lg">
              ⏱️
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Genel Zamanlayıcı & Seans Ayarları</h3>
              <p className="text-xs text-zinc-400">Otomatik tarama döngüsü ve seans dışı davranışlar</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Global Frequency */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-950/50">
              <div>
                <div className="text-xs font-bold text-zinc-200">Global Varsayılan Tarama Sıklığı</div>
                <div className="text-[11px] text-zinc-500">
                  Arka plandaki zamanlayıcının çoklu zaman dilimi tarama döngüsü
                </div>
              </div>
              <select
                value={mailSettings?.config.intervalKey || "15m"}
                onChange={(e) => handleGlobalScheduleChange(e.target.value as MailIntervalKey)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 font-semibold focus:border-sky-500 focus:outline-none"
              >
                {MAIL_INTERVAL_OPTIONS.filter((o) => o.key !== "off").map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Only Trading Hours Toggle */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-950/50">
              <div>
                <div className="text-xs font-bold text-zinc-200">Sadece Seans Saatlerinde Gönder</div>
                <div className="text-[11px] text-zinc-500">
                  BIST kapalıyken veya hafta sonlarında BIST raporları durdurulsun (Kripto 7/24 devam eder)
                </div>
              </div>
              <button
                onClick={handleToggleOnlyTradingHours}
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  mailSettings?.config.onlyTradingHours ? "bg-sky-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                    mailSettings?.config.onlyTradingHours ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Scheduler Status Box */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Zamanlayıcı Durumu:</span>
                <span className="font-semibold text-emerald-400">
                  {mailSettings?.scheduler.initialized ? "✓ Başlatıldı ve Çalışıyor" : "Beklemede"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Son Tarama / Gönderim:</span>
                <span className="font-mono text-zinc-300">
                  {mailSettings?.scheduler.lastMailedAt
                    ? new Date(mailSettings.scheduler.lastMailedAt).toLocaleTimeString("tr-TR")
                    : "Henüz yapılmadı"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Kayıtlı Ayar Dosyası:</span>
                <span className="font-mono text-zinc-400 text-[11px]">mail-settings.md</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Refresh & Cache Settings */}
        <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-lg">
              ⚡
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Veri Yenileme & Önbellek</h3>
              <p className="text-xs text-zinc-400">Arayüz canlı fiyat yenileme sıklığı ve hafıza yönetimi</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Live Refresh Option */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-950/50">
              <div>
                <div className="text-xs font-bold text-zinc-200">Arayüz Veri Yenileme Sıklığı</div>
                <div className="text-[11px] text-zinc-500">
                  Fiyat ve indikatörlerin arka planda otomatik güncellenme aralığı
                </div>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => handleRefreshChange(Number(e.target.value))}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 font-semibold focus:border-amber-500 focus:outline-none"
              >
                {REFRESH_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Crypto Default Landing Category */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-950/50">
              <div>
                <div className="text-xs font-bold text-zinc-200">Kripto Ekranı Varsayılan Sekmesi</div>
                <div className="text-[11px] text-zinc-500">
                  /kripto sayfası açıldığında doğrudan seçilecek kategori
                </div>
              </div>
              <select
                value={cryptoCategory}
                onChange={(e) => handleCryptoCategoryChange(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 font-semibold focus:border-amber-500 focus:outline-none"
              >
                {Object.entries(VALID_CRYPTO_CATEGORIES).map(([catKey, label]) => (
                  <option key={catKey} value={catKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Memory Cache Clear Box */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-zinc-200">Veri & Gösterge Önbelleğini Sıfırla</div>
                <div className="text-[11px] text-zinc-500">
                  Yahoo Finance ve aracı kurum sorgularından kalan önbelleği silip sıfırdan çeker.
                </div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 disabled:opacity-50 transition"
              >
                {clearingCache ? "Temizleniyor..." : "🧹 Önbelleği Temizle"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: SMTP / RESEND ENTEGRASYON VE ÇEVRE DEĞİŞKENLERİ REHBERİ        */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/30 p-5 sm:p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg">📘</span>
          <h3 className="text-base font-bold text-zinc-200">E-Posta Servis Sağlayıcı Kurulum Rehberi</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Finans Asistanı, e-posta gönderiminde <strong>Gmail SMTP</strong> (Uygulama Şifresi) veya <strong>Resend API</strong> kullanır. 
          Alıcı e-posta adresleri ise yukarıdaki tablodan yönetilip <code>mail-recipients.md</code> dosyasında saklanır.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <div className="font-bold text-sky-400 font-sans flex items-center justify-between">
              <span>Seçenek A: Gmail (Önerilen)</span>
              <span className="text-[11px] font-normal text-zinc-500">.env.local</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Google hesabınızda 2 Adımlı Doğrulama açıp &quot;Uygulama Şifresi&quot; (16 haneli) oluşturun:
            </p>
            <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800/80 text-zinc-300 text-[11px]">
              GMAIL_USER=hesabiniz@gmail.com<br />
              GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx<br />
              APP_URL=http://localhost:3000
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <div className="font-bold text-indigo-400 font-sans flex items-center justify-between">
              <span>Seçenek B: Resend API</span>
              <span className="text-[11px] font-normal text-zinc-500">.env.local</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              resend.com üzerinden API anahtarı alarak yapılandırabilirsiniz:
            </p>
            <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800/80 text-zinc-300 text-[11px]">
              RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx<br />
              MAIL_FROM=onboarding@resend.dev<br />
              APP_URL=http://localhost:3000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

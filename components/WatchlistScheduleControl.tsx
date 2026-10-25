"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  WATCHLIST_INTERVAL_OPTIONS,
  type WatchlistCheckInterval,
  type WatchlistMarketScope,
  type WatchlistSettings,
} from "@/lib/watchlist-settings-types";

interface WatchlistScheduleControlProps {
  onScheduleChange?: (settings: WatchlistSettings) => void;
  size?: "sm" | "md";
  align?: "left" | "right";
  market?: WatchlistMarketScope;
}

const MARKET_TABS: Array<{ id: WatchlistMarketScope | "all"; label: string; icon: string }> = [
  { id: "bist", label: "BIST", icon: "🇹🇷" },
  { id: "crypto", label: "Kripto", icon: "⚡" },
  { id: "commodity_forex", label: "Emtia", icon: "🪙" },
  { id: "us_stocks", label: "ABD", icon: "🇺🇸" },
  { id: "all", label: "Genel", icon: "🌐" },
];

export default function WatchlistScheduleControl({
  onScheduleChange,
  size = "md",
  align = "right",
  market,
}: WatchlistScheduleControlProps) {
  const [settings, setSettings] = useState<WatchlistSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WatchlistMarketScope | "all">(market ?? "bist");
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync activeTab when market prop changes
  useEffect(() => {
    if (market) {
      setActiveTab(market);
    }
  }, [market]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const onScheduleChangeRef = useRef(onScheduleChange);
  useEffect(() => {
    onScheduleChangeRef.current = onScheduleChange;
  }, [onScheduleChange]);

  // Fetch settings from API once on mount
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist/settings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (onScheduleChangeRef.current) onScheduleChangeRef.current(json.settings);
        }
      }
    } catch (e) {
      console.error("[WatchlistScheduleControl] Ayarlar yüklenemedi:", e);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Handle interval selection
  const handleSelect = async (intervalKey: WatchlistCheckInterval) => {
    setSaving(true);
    setSuccessMsg(null);

    const targetMarket = activeTab === "all" ? undefined : activeTab;
    const body: { checkInterval: WatchlistCheckInterval; market?: WatchlistMarketScope } = {
      checkInterval: intervalKey,
    };
    if (targetMarket) {
      body.market = targetMarket;
    }

    try {
      const res = await fetch("/api/watchlist/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (onScheduleChange) onScheduleChange(json.settings);
          const opt = WATCHLIST_INTERVAL_OPTIONS.find((o) => o.key === intervalKey);
          const marketLabel =
            targetMarket === "bist"
              ? "BIST"
              : targetMarket === "crypto"
              ? "Kripto"
              : targetMarket === "commodity_forex"
              ? "Emtia & FX"
              : targetMarket === "us_stocks"
              ? "ABD"
              : "Genel";
          setSuccessMsg(`✓ ${marketLabel} sıklığı ${opt?.label ?? intervalKey} olarak kaydedildi`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      }
    } catch (err) {
      console.error("[WatchlistScheduleControl] Kayıt hatası:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle trading hours toggle
  const handleToggleTradingHours = async () => {
    if (!settings) return;
    const newVal = !settings.onlyTradingHours;
    setSaving(true);

    try {
      const res = await fetch("/api/watchlist/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyTradingHours: newVal }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (onScheduleChange) onScheduleChange(json.settings);
        }
      }
    } catch (err) {
      console.error("[WatchlistScheduleControl] Seans ayarı kaydedilemedi:", err);
    } finally {
      setSaving(false);
    }
  };

  const effectiveMarket = market ?? (activeTab === "all" ? undefined : activeTab);
  const currentKey =
    (effectiveMarket && settings?.markets?.[effectiveMarket]) ||
    settings?.checkInterval ||
    "15m";
  const currentOption = WATCHLIST_INTERVAL_OPTIONS.find((o) => o.key === currentKey);
  const isOff = currentKey === "off";

  const marketBadge =
    effectiveMarket === "bist"
      ? "🇹🇷"
      : effectiveMarket === "crypto"
      ? "⚡"
      : effectiveMarket === "commodity_forex"
      ? "🪙"
      : effectiveMarket === "us_stocks"
      ? "🇺🇸"
      : "🌐";

  const btnPadding =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm";

  return (
    <div className="relative inline-flex flex-col gap-0.5 text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${btnPadding} ${
          isOff
            ? "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/20"
        }`}
        title="Sinyal Değişim Kontrolü: Takip listesinde AL/SAT sinyal değişim kontrolü ve e-posta bildirimi (watchlist.md)"
      >
        <span className="text-sm">📡</span>
        <span className="hidden sm:inline">
          {effectiveMarket ? `${marketBadge} Sinyal Değişim Kontrolü:` : "Sinyal Değişim Kontrolü:"}
        </span>
        <span className="sm:hidden">Sinyal Kontrol:</span>
        <span className="font-mono font-semibold">
          {currentOption?.badge ?? currentKey}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <span className="text-[10px] text-zinc-500 px-1 font-normal hidden sm:block">
        Takip listesi sinyal değişim kontrol sıklığı
      </span>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md transition ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Sinyal Değişim Kontrolü
              </div>
              <div className="text-[10px] text-zinc-400">
                Takip listesinde AL/SAT sinyal değişim kontrolü ve e-posta bildirimi (watchlist.md)
              </div>
            </div>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                isOff
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              watchlist.md
            </span>
          </div>

          {/* Market Selector Tabs */}
          <div className="mb-2.5 flex items-center gap-1 rounded-lg bg-zinc-950/70 p-1 border border-zinc-800">
            {MARKET_TABS.map((tab) => {
              const isTabActive = activeTab === tab.id;
              const tabInterval =
                tab.id === "all"
                  ? settings?.checkInterval || "15m"
                  : settings?.markets?.[tab.id] || settings?.checkInterval || "15m";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded py-1 text-[10px] font-semibold transition ${
                    isTabActive
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title={`${tab.label}: ${tabInterval}`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition">
              {successMsg}
            </div>
          )}

          {/* Interval Options */}
          <div className="mb-3 space-y-1">
            <div className="mb-1 text-[11px] font-medium text-zinc-300 flex items-center justify-between">
              <span>
                {activeTab === "all"
                  ? "🌐 Genel Tarama Sıklığı:"
                  : `${marketBadge} ${
                      activeTab === "bist"
                        ? "BIST"
                        : activeTab === "crypto"
                        ? "Kripto (7/24)"
                        : activeTab === "commodity_forex"
                        ? "Emtia & FX"
                        : "ABD Borsası"
                    } Sıklığı:`}
              </span>
              <span className="font-mono text-[10px] text-amber-400 font-semibold">{currentKey}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {WATCHLIST_INTERVAL_OPTIONS.map((opt) => {
                const isSelected = opt.key === currentKey;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSelect(opt.key)}
                    className={`flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/20 text-amber-200 font-semibold shadow-sm"
                        : "border-zinc-800/80 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="font-mono text-xs">{opt.label}</span>
                    <span className="text-[10px] text-zinc-500">
                      {opt.key === "off" ? "Kapalı" : opt.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trading Hours Toggle */}
          <div className="mb-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="pr-2">
                <div className="text-xs font-medium text-zinc-300">
                  Sadece Seans İçi Kontrol
                </div>
                <div className="text-[10px] text-zinc-500">
                  Borsa kapalıyken taramayı durdur (09:50 - 18:00)
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings?.onlyTradingHours ?? true}
                onChange={() => void handleToggleTradingHours()}
                disabled={saving}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500/30"
              />
            </label>
          </div>

          {/* Status info */}
          <div className="border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Son Kontrol:</span>
              <span className="font-mono text-zinc-300">
                {settings?.lastCheckAt
                  ? new Date(settings.lastCheckAt).toLocaleTimeString("tr-TR")
                  : "Henüz yapılmadı"}
              </span>
            </div>
            {settings?.lastChangedAt && (
              <div className="flex justify-between">
                <span>Son Sinyal Değişimi:</span>
                <span className="font-mono text-amber-300">
                  {new Date(settings.lastChangedAt).toLocaleTimeString("tr-TR")}
                </span>
              </div>
            )}
            <div className="mt-1 text-[10px] text-zinc-500 italic">
              * Arka plan zamanlayıcısı bu periyotta hisselerin sinyallerini hesaplar; AL/SAT sinyali değiştiğinde bildirim e-postası gönderilir.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

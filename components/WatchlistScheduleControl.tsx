"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  WATCHLIST_INTERVAL_OPTIONS,
  type WatchlistCheckInterval,
  type WatchlistSettings,
} from "@/lib/watchlist-settings-types";

interface WatchlistScheduleControlProps {
  onScheduleChange?: (settings: WatchlistSettings) => void;
  size?: "sm" | "md";
  align?: "left" | "right";
}

export default function WatchlistScheduleControl({
  onScheduleChange,
  size = "md",
  align = "right",
}: WatchlistScheduleControlProps) {
  const [settings, setSettings] = useState<WatchlistSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist/settings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (onScheduleChange) onScheduleChange(json.settings);
        }
      }
    } catch (e) {
      console.error("[WatchlistScheduleControl] Ayarlar yüklenemedi:", e);
    }
  }, [onScheduleChange]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Handle interval selection
  const handleSelect = async (intervalKey: WatchlistCheckInterval) => {
    setSaving(true);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/watchlist/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInterval: intervalKey }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings);
          if (onScheduleChange) onScheduleChange(json.settings);
          const opt = WATCHLIST_INTERVAL_OPTIONS.find((o) => o.key === intervalKey);
          setSuccessMsg(`✓ Tarama sıklığı ${opt?.label ?? intervalKey} olarak kaydedildi`);
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

  const currentKey = settings?.checkInterval ?? "15m";
  const currentOption = WATCHLIST_INTERVAL_OPTIONS.find((o) => o.key === currentKey);
  const isOff = currentKey === "off";

  const btnPadding =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${btnPadding} ${
          isOff
            ? "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/20"
        }`}
        title="Takip Listesi Sinyal Değişim Kontrol Sıklığı (watchlist.md)"
      >
        <span className="text-sm">📡</span>
        <span className="hidden sm:inline">Sinyal Kontrol:</span>
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

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md transition ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Takip Listesi Sinyal Taraması
              </div>
              <div className="text-[11px] text-zinc-400">
                Sinyal değiştiğinde otomatik e-posta gönderir
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

          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition">
              {successMsg}
            </div>
          )}

          {/* Interval Options */}
          <div className="mb-3 space-y-1">
            <div className="mb-1 text-[11px] font-medium text-zinc-400">
              Tarama Sıklığı Seçin:
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
                  Sadece Seans Saatlerinde
                </div>
                <div className="text-[10px] text-zinc-500">
                  09:50 - 18:00 (Pazartesi - Cuma)
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

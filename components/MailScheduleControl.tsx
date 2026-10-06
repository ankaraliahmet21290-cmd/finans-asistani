"use client";

import { useEffect, useState, useRef } from "react";
import {
  MAIL_INTERVAL_OPTIONS,
  type MailIntervalKey,
  type MailIntervalOption,
  type MailScheduleConfig,
} from "@/lib/mail-settings-types";
import MailRecipientsModal from "./MailRecipientsModal";

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
  };
}

interface MailScheduleControlProps {
  onScheduleChange?: (config: MailScheduleConfig) => void;
  size?: "sm" | "md";
  align?: "left" | "right";
}

export default function MailScheduleControl({
  onScheduleChange,
  size = "md",
  align = "left",
}: MailScheduleControlProps) {
  const [data, setData] = useState<MailSettingsResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<MailIntervalKey>("15m");
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
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

  // Fetch current mail settings from API
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/mail/settings", { cache: "no-store" });
      if (res.ok) {
        const json: MailSettingsResponse = await res.json();
        setData(json);
        setActiveKey(json.config.intervalKey);
        if (onScheduleChange) onScheduleChange(json.config);
      }
    } catch (e) {
      console.error("[MailScheduleControl] Yükleme hatası:", e);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  // Update selection
  const handleSelect = async (optKey: MailIntervalKey) => {
    setActiveKey(optKey);
    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch("/api/mail/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervalKey: optKey }),
      });

      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: json.config,
                scheduler: json.scheduler,
              }
            : null
        );
        if (onScheduleChange) onScheduleChange(json.config);
        setSaveSuccessMsg(`✓ mail-settings.md: "${json.config.label}" kaydedildi`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error("[MailScheduleControl] Kaydetme hatası:", e);
    } finally {
      setSaving(false);
      setIsOpen(false);
    }
  };

  const options = data?.options && data.options.length > 0 ? data.options : MAIL_INTERVAL_OPTIONS;

  const currentOption =
    options.find((o) => o.key === activeKey) ??
    options.find((o) => o.key === "15m") ??
    options[0];

  const isConfigured = data?.mail.configured ?? false;
  const isOff = activeKey === "off";
  const alignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div
      className={`relative inline-flex items-center gap-2 ${isOpen ? "z-50" : "z-10"}`}
      ref={menuRef}
    >
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 rounded-xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/40 via-zinc-900/90 to-zinc-900/90 font-medium text-zinc-300 shadow-sm transition hover:border-indigo-600/70 hover:bg-zinc-800/80 hover:text-zinc-100 ${
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        }`}
        title="Otomatik e-posta gönderim sıklığını ayarla (mail-settings.md)"
      >
        {/* Animated icon */}
        <div className="relative flex h-4 w-4 items-center justify-center">
          {saving ? (
            <svg className="h-3.5 w-3.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : isOff ? (
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
          )}
        </div>

        <span className="text-zinc-400 font-normal">Mail Sıklığı:</span>
        <span className="font-semibold text-indigo-200">{currentOption.label}</span>

        {/* Small file badge indicator */}
        <span className="hidden sm:inline-flex items-center rounded bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-800/40">
          .md
        </span>

        <svg
          className={`h-3 w-3 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Success Notification Bubble */}
      {saveSuccessMsg && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-2 py-0.5 text-[11px] font-medium text-emerald-300 animate-in fade-in zoom-in-95 duration-200">
          {saveSuccessMsg}
        </span>
      )}

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div
          className={`absolute ${alignClass} top-full z-[100] mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-950/98 p-2 shadow-2xl backdrop-blur-xl transition duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-2.5 py-2 mb-1.5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <span>✉️ E-Posta Gönderim Sıklığı</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                Kaynak: mail-settings.md
              </div>
            </div>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {isConfigured ? "Mail Aktif" : "Sağlayıcı Yok"}
            </span>
          </div>

          {/* Options List */}
          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
            {options.map((opt) => {
              const isSelected = opt.key === activeKey;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelect(opt.key)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                    isSelected
                      ? "bg-indigo-600/20 font-bold text-indigo-200 border border-indigo-500/40 shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-sm mt-0.5">
                      {opt.key === "5m" || opt.key === "10m"
                        ? "⚡"
                        : opt.key === "1h" || opt.key === "2h" || opt.key === "4h"
                        ? "⏱️"
                        : opt.key === "daily"
                        ? "📅"
                        : opt.key === "off"
                        ? "⏸️"
                        : "🕒"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span
                          className={`rounded px-1 text-[9px] font-mono ${
                            isSelected
                              ? "bg-indigo-500/30 text-indigo-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <div className="text-[10px] font-normal text-zinc-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-indigo-400 text-xs font-bold pl-2">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-2 border-t border-zinc-800/80 px-2.5 pt-2 text-[10px] text-zinc-500 flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span>Seans Saatleri:</span>
              <span className="font-medium text-zinc-400">09:50 - 18:00 (Pzt - Cum)</span>
            </div>
            {data?.scheduler.lastMailedAt && (
              <div className="flex items-center justify-between">
                <span>Son Mail:</span>
                <span className="font-mono text-zinc-400">
                  {new Date(data.scheduler.lastMailedAt).toLocaleTimeString("tr-TR")}
                </span>
              </div>
            )}
            {!isConfigured && (
              <div className="mt-1 text-amber-400/90 text-[10px]">
                ℹ️ Gerçek mail gönderimi için .env dosyanızda GMAIL veya RESEND yapılandırması olmalıdır.
              </div>
            )}

            {/* Recipient Management Button */}
            <div className="mt-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsRecipientsModalOpen(true);
                }}
                className="w-full flex items-center justify-between rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-750 px-2.5 py-1.5 text-xs text-sky-300 font-medium transition hover:border-sky-500/50"
              >
                <span className="flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Alıcı Listesini Yönet</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">mail-recipients.md →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Management Modal */}
      <MailRecipientsModal
        isOpen={isRecipientsModalOpen}
        onClose={() => setIsRecipientsModalOpen(false)}
      />
    </div>
  );
}

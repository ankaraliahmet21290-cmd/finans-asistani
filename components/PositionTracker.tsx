"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BistCombobox from "./BistCombobox";
import { formatPrice, formatPercent, formatSigned } from "@/lib/format";
import { TIMEFRAMES, type TimeframeKey } from "@/lib/timeframes";
import type { BistCompany } from "@/lib/bist";
import type {
  PositionCheckInterval,
  PositionEntry,
  PositionSettings,
} from "@/lib/position-types";

const INTERVAL_OPTIONS: Array<{ key: PositionCheckInterval; label: string }> = [
  { key: "1m", label: "1 Dakika" },
  { key: "5m", label: "5 Dakika" },
  { key: "15m", label: "15 Dakika" },
  { key: "30m", label: "30 Dakika" },
  { key: "1h", label: "1 Saat" },
  { key: "off", label: "Kapalı" },
];

export default function PositionTracker() {
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [settings, setSettings] = useState<PositionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);
  const [formTimeframe, setFormTimeframe] = useState<TimeframeKey>("1h");
  const [formEntryPrice, setFormEntryPrice] = useState<string>("");
  const [formStopLoss, setFormStopLoss] = useState<string>("");
  const [formTakeProfit, setFormTakeProfit] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch positions and settings
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/positions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPositions(data.positions || []);
      setSettings(data.settings || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pozisyonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // When company or timeframe changes, auto-calculate suggested entry, stopLoss, and takeProfit
  const calculateLevels = useCallback(
    async (ticker: string, tf: TimeframeKey) => {
      try {
        const res = await fetch(`/api/analyze?ticker=${encodeURIComponent(ticker)}&timeframe=${tf}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const p = data.price ?? 0;
          const stop = data.tech?.volatility?.stopLoss ?? p * 0.95;
          const target = data.tech?.volatility?.takeProfit ?? p * 1.08;

          setFormEntryPrice(p.toFixed(2));
          setFormStopLoss(stop.toFixed(2));
          setFormTakeProfit(target.toFixed(2));
        }
      } catch {
        // ignore
      }
    },
    []
  );

  const handleSelectCompany = (company: BistCompany) => {
    setSelectedCompany(company);
    void calculateLevels(company.ticker, formTimeframe);
  };

  const handleTimeframeChange = (tf: TimeframeKey) => {
    setFormTimeframe(tf);
    if (selectedCompany) {
      void calculateLevels(selectedCompany.ticker, tf);
    }
  };

  // Save new position
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selectedCompany.ticker,
          timeframe: formTimeframe,
          entryPrice: parseFloat(formEntryPrice) || undefined,
          stopLoss: parseFloat(formStopLoss) || undefined,
          takeProfit: parseFloat(formTakeProfit) || undefined,
          notes: formNotes,
        }),
      });

      if (!res.ok) throw new Error("Pozisyon eklenemedi");

      // Reset form
      setShowAddForm(false);
      setSelectedCompany(null);
      setFormNotes("");
      void fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Pozisyon kaydedilemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove position
  const handleRemovePosition = async (id: string, code: string) => {
    if (!confirm(`${code} pozisyonunu takipten kaldırmak istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/positions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPositions((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      alert("Pozisyon silinirken hata oluştu");
    }
  };

  // Update check interval setting
  const handleIntervalChange = async (interval: PositionCheckInterval) => {
    try {
      const res = await fetch("/api/positions/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInterval: interval }),
      });
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
      }
    } catch {
      alert("Ayar kaydedilemedi");
    }
  };

  // Manual Trigger Check
  const handleTriggerCheck = async () => {
    try {
      setChecking(true);
      setCheckMessage(null);
      const res = await fetch("/api/positions/check?force=true", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setCheckMessage(
          json.alarmsSent > 0
            ? `✓ ${json.alarmsSent} adet alarm e-posta ile iletildi!`
            : `✓ Kontrol edildi: ${json.message}`
        );
        void fetchData();
      } else {
        setCheckMessage(`Hata: ${json.message}`);
      }
    } catch (e) {
      setCheckMessage(e instanceof Error ? e.message : "Kontrol sırasında hata oluştu");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-4 sm:p-6 shadow-xl backdrop-blur-md">
        {/* Header Bar */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">
                💼
              </span>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                Portföy Pozisyon Takibi & Canlı Alarm Masası
              </h2>
              <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400 hidden sm:inline-flex">
                portfoy-takip.md
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Hangi periyotta hangi hisseyi aldığınızı işaretleyin. Fiyat belirlediğiniz{" "}
              <strong className="text-red-400">Stop-Loss (🛑)</strong> veya{" "}
              <strong className="text-emerald-400">Kâr Al (🎯)</strong> seviyelerine ulaştığında sistem otomatik e-posta alarmı gönderir.
            </p>
          </div>

          {/* Controls: Check Interval Dropdown & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Interval Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs">
              <span className="text-[11px] text-zinc-400">⏰ Tarama:</span>
              <select
                value={settings?.checkInterval ?? "5m"}
                onChange={(e) => void handleIntervalChange(e.target.value as PositionCheckInterval)}
                className="bg-transparent font-semibold text-zinc-200 outline-none cursor-pointer text-xs"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key} className="bg-zinc-900 text-zinc-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Check Now Button */}
            <button
              onClick={handleTriggerCheck}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white disabled:opacity-50"
              title="Anlık fiyatları sorgula ve stop/hedef kontrolü yap"
            >
              <svg
                className={`h-3.5 w-3.5 text-sky-400 ${checking ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{checking ? "Kontrol Ediliyor…" : "Şimdi Kontrol Et"}</span>
            </button>

            {/* Add Position Toggle Button */}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500"
            >
              <span>{showAddForm ? "✕ Kapat" : "+ Yeni Pozisyon Ekle"}</span>
            </button>
          </div>
        </div>

        {/* Check Feedback Message */}
        {checkMessage && (
          <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-950/40 px-3.5 py-2 text-xs font-medium text-sky-300 animate-in fade-in">
            {checkMessage}
          </div>
        )}

        {/* ADD POSITION FORM PANEL */}
        {showAddForm && (
          <form
            onSubmit={handleAddPosition}
            className="mt-4 rounded-2xl border border-emerald-900/40 bg-zinc-950/80 p-4 sm:p-5 shadow-inner backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span>➕</span> Yeni Alınan Pozisyon Ekle
              </h3>
              <span className="text-[11px] text-zinc-500">
                Seçtiğiniz periyoda göre dinamik Stop-Loss ve Hedef otomatik doldurulur.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Ticker Selector */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  1. Alınan Hisse
                </label>
                <BistCombobox
                  placeholder="Hisse ara (THYAO, GARAN...)"
                  autoNavigate={false}
                  onSelect={handleSelectCompany}
                />
                {selectedCompany && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    ✓ Seçildi: {selectedCompany.code} - {selectedCompany.name}
                  </p>
                )}
              </div>

              {/* Timeframe Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  2. Alındığı Periyot (Grafik Vadesi)
                </label>
                <select
                  value={formTimeframe}
                  onChange={(e) => handleTimeframeChange(e.target.value as TimeframeKey)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none focus:border-emerald-500"
                >
                  <option value="5m">5 Dakikalık (5m - Çok Hızlı)</option>
                  <option value="15m">15 Dakikalık (15m - Gün İçi)</option>
                  <option value="30m">30 Dakikalık (30m - Gün İçi Yön)</option>
                  <option value="1h">1 Saatlik (1h - Kısa Vade Salınım)</option>
                  <option value="2h">2 Saatlik (2h)</option>
                  <option value="4h">4 Saatlik (4h - Ana Swing)</option>
                  <option value="1d">Günlük (1d - Orta Vade)</option>
                  <option value="1wk">Haftalık (1wk - Uzun Vade)</option>
                </select>
              </div>

              {/* Entry Price */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  3. Alış Fiyatı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Örn: 290.50"
                  value={formEntryPrice}
                  onChange={(e) => setFormEntryPrice(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <label className="block text-[11px] font-semibold text-red-400 mb-1">
                  🛑 Stop-Loss (1.5x ATR) (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Örn: 278.20"
                  value={formStopLoss}
                  onChange={(e) => setFormStopLoss(e.target.value)}
                  className="w-full rounded-xl border border-red-900/40 bg-zinc-900 px-3 py-2 font-mono text-xs text-red-300 outline-none focus:border-red-500"
                />
              </div>

              {/* Take Profit */}
              <div>
                <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                  🎯 Kâr Al / Hedef (2.5x ATR) (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Örn: 311.00"
                  value={formTakeProfit}
                  onChange={(e) => setFormTakeProfit(e.target.value)}
                  className="w-full rounded-xl border border-emerald-900/40 bg-zinc-900 px-3 py-2 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Not / Strateji (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 1S Golden Cross sonrası alım"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!selectedCompany || isSubmitting}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSubmitting ? "Kaydediliyor…" : "Pozisyonu Kaydet (portfoy-takip.md)"}
              </button>
            </div>
          </form>
        )}

        {/* POSITIONS LIST TABLE */}
        <div className="mt-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-xs text-red-400">
              {error}
            </div>
          ) : positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800/80 p-8 text-center">
              <span className="text-2xl block mb-2">📥</span>
              <p className="text-sm font-semibold text-zinc-300">Henüz kayıtlı pozisyonunuz bulunmuyor.</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                Yukarıdaki <strong>"+ Yeni Pozisyon Ekle"</strong> butonuna basarak aldığınız hisseleri ve grafik periyotlarını kaydedebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {positions.map((pos) => {
                const currentPrice = pos.currentPrice ?? pos.entryPrice;
                const isProfit = (pos.profitLossPercent ?? 0) >= 0;
                const profitTl = currentPrice - pos.entryPrice;
                const tfConfig = TIMEFRAMES[pos.timeframe] ?? TIMEFRAMES["1d"];

                return (
                  <div
                    key={pos.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-lg backdrop-blur-md transition hover:border-zinc-750"
                  >
                    {/* Top Row: Symbol, Timeframe, Status & Delete */}
                    <div>
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/symbol/${encodeURIComponent(pos.ticker)}`}
                            className="font-mono text-sm font-bold text-sky-400 hover:text-sky-300"
                          >
                            {pos.code}
                          </Link>
                          <span className="rounded-md border border-zinc-700 bg-zinc-800/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-300">
                            {pos.timeframe.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {pos.status === "take_profit_hit" ? (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              🎯 Kâr Alındı
                            </span>
                          ) : pos.status === "stop_loss_hit" ? (
                            <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              🛑 Stop Oldu
                            </span>
                          ) : (
                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                              🟢 Takipte
                            </span>
                          )}

                          <button
                            onClick={() => handleRemovePosition(pos.id, pos.code)}
                            title="Pozisyonu Sil"
                            className="text-zinc-500 hover:text-red-400 transition text-xs p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Name & Date */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="truncate max-w-[150px]">{pos.name}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{pos.entryDate}</span>
                      </div>

                      {/* Price & PnL Box */}
                      <div className="mt-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-zinc-500">
                            Alış: {formatPrice(pos.entryPrice, "TRY")}
                          </span>
                          <span className="font-mono font-bold text-sm text-zinc-100">
                            {formatPrice(currentPrice, "TRY")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-semibold text-zinc-500">
                            Net Getiri
                          </span>
                          <div className={`font-mono font-bold text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {formatSigned(pos.profitLossPercent ?? 0)}%
                            <span className="text-[10px] ml-1 font-normal text-zinc-400">
                              ({profitTl >= 0 ? "+" : ""}{profitTl.toFixed(2)}₺)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stop-Loss & Take-Profit Targets Grid */}
                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                        {/* Stop Loss box */}
                        <div className="rounded-xl border border-red-950/40 bg-red-950/15 p-2">
                          <span className="block text-[10px] uppercase font-semibold text-red-400/80">
                            🛑 Stop-Loss
                          </span>
                          <span className="font-mono font-bold text-xs text-red-300">
                            {formatPrice(pos.stopLoss, "TRY")}
                          </span>
                          <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                            {(pos.distanceToStopPercent ?? 0) > 0 ? `%${pos.distanceToStopPercent} mesafe` : "Seviye aşıldı"}
                          </span>
                        </div>

                        {/* Take Profit box */}
                        <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/15 p-2">
                          <span className="block text-[10px] uppercase font-semibold text-emerald-400/80">
                            🎯 Kâr Al Hedefi
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-300">
                            {formatPrice(pos.takeProfit, "TRY")}
                          </span>
                          <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                            {(pos.distanceToTargetPercent ?? 0) > 0 ? `%${pos.distanceToTargetPercent} kaldı` : "Hedefe ulaşıldı"}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Reason Preview */}
                      {pos.notes && (
                        <p className="mt-2 text-[11px] text-zinc-400 italic bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-850 truncate">
                          "{pos.notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Link Button */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-zinc-500">
                        {tfConfig.label} vade
                      </span>
                      <Link
                        href={`/symbol/${encodeURIComponent(pos.ticker)}`}
                        className="font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <span>Grafiği Aç</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

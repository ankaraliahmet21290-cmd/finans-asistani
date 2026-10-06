"use client";

import { useEffect, useState, useRef } from "react";
import type { MailRecipient } from "@/lib/mail-recipients-types";

interface MailRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function MailRecipientsModal({
  isOpen,
  onClose,
  onCountChange,
}: MailRecipientsModalProps) {
  const [recipients, setRecipients] = useState<MailRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recipients
  const loadRecipients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mail/recipients", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients || []);
        if (onCountChange) {
          onCountChange(data.activeCount ?? 0);
        }
      } else {
        setMessage({ text: data.error || "Alıcılar yüklenemedi.", type: "error" });
      }
    } catch {
      setMessage({ text: "Bağlantı hatası oluştu.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadRecipients();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setMessage(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Add recipient
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/mail/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          name: newName.trim() || undefined,
          enabled: true,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients);
        setNewEmail("");
        setNewName("");
        setMessage({
          text: `✓ "${emailTrimmed}" eklendi ve mail-recipients.md dosyasına kaydedildi!`,
          type: "success",
        });
        if (onCountChange) onCountChange(data.activeCount ?? 0);
      } else {
        setMessage({ text: data.error || "Ekleme başarısız.", type: "error" });
      }
    } catch {
      setMessage({ text: "İşlem sırasında sunucu hatası oluştu.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active / passive
  const handleToggle = async (email: string, currentEnabled: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/mail/recipients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          enabled: !currentEnabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients);
        if (onCountChange) onCountChange(data.activeCount ?? 0);
      } else {
        setMessage({ text: data.error || "Güncelleme hatası", type: "error" });
      }
    } catch {
      setMessage({ text: "Güncelleme başarısız.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);

  // Delete recipient
  const handleDelete = async (email: string) => {
    setActionLoading(true);
    setDeleteConfirmEmail(null);
    try {
      const res = await fetch(`/api/mail/recipients?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setRecipients(data.recipients);
        setMessage({
          text: `✓ "${email}" silindi ve mail-recipients.md güncellendi.`,
          type: "info",
        });
        if (onCountChange) onCountChange(data.activeCount ?? 0);
      } else {
        setMessage({ text: data.error || "Silme başarısız.", type: "error" });
      }
    } catch {
      setMessage({ text: "Silme işlemi sırasında hata oluştu.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Test mail sending
  const handleSendTestMail = async () => {
    const activeList = recipients.filter((r) => r.enabled);
    if (activeList.length === 0) {
      setMessage({
        text: "Test göndermek için en az bir aktif alıcı olmalıdır.",
        type: "error",
      });
      return;
    }

    setTestSending(true);
    setMessage({
      text: `${activeList.length} aktif alıcıya test e-postası gönderiliyor...`,
      type: "info",
    });

    try {
      const res = await fetch("/api/mail/test", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMessage({
          text: `✓ Test e-postası ${data.recipientsCount} adrese başarıyla gönderildi! (${data.recipients?.join(", ")})`,
          type: "success",
        });
      } else {
        setMessage({ text: `Hata: ${data.error || "Gönderilemedi"}`, type: "error" });
      }
    } catch {
      setMessage({ text: "Test maili gönderilirken bağlantı hatası oluştu.", type: "error" });
    } finally {
      setTestSending(false);
    }
  };

  if (!isOpen) return null;

  const activeCount = recipients.filter((r) => r.enabled).length;
  const filteredRecipients = recipients.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.email.toLowerCase().includes(q) || (r.name && r.name.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✉️</span>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                E-Posta Alıcı Listesi
              </h2>
              <span className="rounded-md bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                mail-recipients.md
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Sinyal ve bülten raporları bu listedeki <strong className="text-emerald-400 font-semibold">Aktif</strong> adreslere eş zamanlı gönderilir.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            title="Kapat (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mt-3 flex items-center justify-between rounded-xl p-3 text-xs border ${
              message.type === "success"
                ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-200"
                : message.type === "error"
                ? "bg-red-950/60 border-red-600/40 text-red-200"
                : "bg-sky-950/60 border-sky-600/40 text-sky-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{message.type === "success" ? "✓" : message.type === "error" ? "⚠️" : "ℹ️"}</span>
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-zinc-400 hover:text-zinc-200 text-xs px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Add New Recipient Form */}
        <form onSubmit={handleAddRecipient} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-2.5 flex items-center justify-between">
            <span>+ Yeni Alıcı Ekle</span>
            <span className="text-[10px] font-normal text-zinc-500 font-mono">
              Otomatik md senkronize
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-7">
              <input
                ref={inputRef}
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ornek@alanadi.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="İsim / Not (Opsiyonel)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={actionLoading || !newEmail.trim()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-3 py-2 text-xs transition shadow-md shadow-indigo-600/20"
              >
                {actionLoading ? (
                  <span className="animate-spin text-xs">⌛</span>
                ) : (
                  <>
                    <span>Ekle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Recipient Count & Search */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300">Kayıtlı Alıcılar:</span>
            <span className="rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {activeCount} Aktif
            </span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {recipients.length} Toplam
            </span>
          </div>

          {recipients.length > 3 && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Listede ara..."
              className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>

        {/* Recipients List */}
        <div className="mt-2.5 flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-xs">
              <span className="animate-spin text-lg mb-2">⌛</span>
              <span>mail-recipients.md okunuyor...</span>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs text-center p-4">
              <span className="text-2xl mb-1">📭</span>
              <p className="font-medium text-zinc-400">Alıcı adresi bulunamadı.</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Yukarıdaki formdan hemen yeni bir e-posta adresi ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            filteredRecipients.map((r) => (
              <div
                key={r.email}
                className={`flex items-center justify-between rounded-xl border p-3 transition ${
                  r.enabled
                    ? "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    : "border-zinc-850 bg-zinc-950/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
                      r.enabled
                        ? "bg-indigo-950 text-indigo-300 border border-indigo-700/50"
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                    }`}
                  >
                    {r.name ? r.name.charAt(0) : r.email.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-zinc-200">
                        {r.email}
                      </span>
                      {r.name && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                          {r.name}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {r.addedAt
                        ? `Eklenme: ${new Date(r.addedAt).toLocaleDateString("tr-TR")}`
                        : "Kayıtlı"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(r.email, r.enabled)}
                    title={r.enabled ? "Pasife al" : "Aktife al"}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition border ${
                      r.enabled
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
                        : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    <span>{r.enabled ? "🟢 Aktif" : "⚪ Pasif"}</span>
                  </button>

                  {/* Delete Button with inline confirmation */}
                  {deleteConfirmEmail === r.email ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.email)}
                        className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-500 transition shadow-sm"
                        title="Silmeyi Onayla"
                      >
                        Sil ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmEmail(null)}
                        className="rounded-lg bg-zinc-800 px-1.5 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition"
                        title="İptal"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmEmail(r.email)}
                      title="Alıcıyı Sil"
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600/30 border border-transparent transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <span>💾 Dosya Konumu:</span>
            <code className="text-indigo-400 font-mono">./mail-recipients.md</code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendTestMail}
              disabled={testSending || activeCount === 0}
              className="flex items-center gap-1.5 rounded-xl border border-sky-600/40 bg-sky-950/60 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/70 hover:border-sky-500 transition disabled:opacity-40 shadow-sm"
            >
              {testSending ? (
                <>
                  <span className="animate-spin">⌛</span>
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <span>🚀 Test E-postası Gönder</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import MailRecipientsModal from "./MailRecipientsModal";

interface MailRecipientsControlProps {
  size?: "sm" | "md";
  className?: string;
}

export default function MailRecipientsControl({
  size = "md",
  className = "",
}: MailRecipientsControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/mail/recipients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.activeCount ?? 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchCount();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="E-posta alıcı listesini yönet (mail-recipients.md)"
        className={`group flex items-center gap-2 rounded-xl border border-sky-900/40 bg-gradient-to-r from-sky-950/40 via-zinc-900/90 to-zinc-900/90 font-medium text-zinc-300 shadow-sm transition hover:border-sky-500/60 hover:bg-zinc-800/80 hover:text-zinc-100 ${
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        } ${className}`}
      >
        <span className="text-sm">👥</span>
        <span className="text-zinc-400 font-normal">Alıcılar:</span>
        <span className="font-semibold text-sky-200">
          {activeCount !== null ? `${activeCount} Aktif` : "Listesi"}
        </span>

        {/* Small file indicator badge */}
        <span className="hidden sm:inline-flex items-center rounded bg-sky-950/60 px-1.5 py-0.5 text-[9px] font-mono text-sky-300 border border-sky-800/40">
          .md
        </span>
      </button>

      <MailRecipientsModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          void fetchCount();
        }}
        onCountChange={(count) => setActiveCount(count)}
      />
    </>
  );
}

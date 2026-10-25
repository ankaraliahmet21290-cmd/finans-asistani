"use client";

import Link from "next/link";
import BistCombobox from "./BistCombobox";
import MobileNavigation from "./MobileNavigation";

export default function AppHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-zinc-100 transition hover:text-sky-400"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 shadow-md shadow-sky-500/20">
              <span className="text-xs font-black text-white">FA</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold leading-tight">
                Finans Asistanı
              </span>
              <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">
                BIST & Altın Karar Destek
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar (hidden on mobile) */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <BistCombobox compact placeholder="BIST hisse ara (⌘K)..." autoNavigate={true} />
          </div>

          {/* Desktop Guide Links & Market Status (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/kullanim-kilavuzu"
              className="shrink-0 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
            >
              📖 Kullanım Kılavuzu
            </Link>
            <Link
              href="/teknik-detay-klavuzu"
              className="shrink-0 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
            >
              📊 Teknik Detay
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              09:50 - 18:00
            </span>
          </div>

          {/* Mobile Navigation Controls & Overlays */}
          <MobileNavigation />
        </div>
      </header>
    </>
  );
}

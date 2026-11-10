"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BistCombobox from "./BistCombobox";
import MobileNavigation from "./MobileNavigation";
import Logo from "./Logo";
import { MARKETS, getMarketSessionStatus } from "@/lib/markets";

export default function AppHeader() {
  const pathname = usePathname();

  // Determine active market based on current URL
  const currentMarket =
    MARKETS.find((m) => {
      if (m.path === "/") return pathname === "/";
      return pathname.startsWith(m.path);
    }) ?? MARKETS[0];

  const sessionStatus = getMarketSessionStatus(currentMarket.id);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      {/* Upper Main Bar */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 font-bold tracking-tight text-zinc-100 transition hover:text-sky-300"
        >
          <div className="transition-transform duration-300 group-hover:scale-105">
            <Logo size={36} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold leading-tight tracking-tight">
                Finans Asistanı
              </span>
              <span className="hidden sm:inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-sky-400">
                PRO
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              Çoklu Piyasa Karar Destek Terminali
            </span>
          </div>
        </Link>

        {/* Desktop Search Bar (hidden on mobile) */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <BistCombobox compact placeholder="Hisse veya varlık ara (⌘K)..." autoNavigate={true} />
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
          <Link
            href="/analitik"
            className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pathname === "/analitik"
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>👥 Canlı Analitik</span>
          </Link>
          <Link
            href="/takip"
            className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pathname === "/takip"
                ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-violet-400 hover:bg-zinc-800/80"
            }`}
          >
            <span>📌 İzleme Listesi</span>
          </Link>
          <Link
            href="/pozisyonlar"
            className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pathname === "/pozisyonlar"
                ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-rose-400 hover:bg-zinc-800/80"
            }`}
          >
            <span>💼 Portföy</span>
          </Link>
          <Link
            href="/ayarlar"
            className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pathname === "/ayarlar"
                ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-sky-400 hover:bg-zinc-800/80"
            }`}
          >
            <span>⚙️ Ayarlar</span>
          </Link>

          {/* Dynamic Active Market Session Indicator */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${sessionStatus.badgeColor}`}
            title={`${currentMarket.name}: ${sessionStatus.statusText}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sessionStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
            <span>{currentMarket.shortName}: {sessionStatus.statusText.split("(")[0].trim()}</span>
          </span>
        </div>

        {/* Mobile Navigation Controls & Overlays */}
        <MobileNavigation />
      </div>

      {/* Market Navigation Tabs Bar (Desktop & Mobile Horizontal Scroll) */}
      <div className="border-t border-zinc-800/60 bg-zinc-950/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <nav
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1.5 scrollbar-none touch-scroll"
            aria-label="Piyasa Navigasyonu"
          >
            {MARKETS.map((m) => {
              const isActive =
                m.path === "/" ? pathname === "/" : pathname.startsWith(m.path);

              return (
                <Link
                  key={m.id}
                  href={m.path}
                  className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "border border-sky-500/40 bg-gradient-to-r from-sky-500/20 via-indigo-500/15 to-violet-500/20 text-sky-200 shadow-sm shadow-sky-500/10"
                      : "border border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm">{m.icon}</span>
                  <span>{m.name}</span>

                  {/* Badges per market */}
                  {m.id === "crypto" && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono text-emerald-300">
                      7/24
                    </span>
                  )}
                  {m.id === "commodity_forex" && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-mono text-amber-300">
                      Altın & FX
                    </span>
                  )}
                  {m.id === "us_stocks" && (
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300">
                      Nasdaq/S&P
                    </span>
                  )}

                  {/* Active bottom glow line */}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Info text on desktop right */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>{currentMarket.tradingHours}</span>
            <span>·</span>
            <span>Teknik + Temel Karar Motoru</span>
          </div>
        </div>
      </div>
    </header>
  );
}

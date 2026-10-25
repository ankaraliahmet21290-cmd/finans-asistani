"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import BistCombobox from "./BistCombobox";

export default function MobileNavigation() {
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track scroll position to highlight bottom nav tab
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 250;

      const sections = [
        { id: "watchlist-section", key: "watchlist" },
        { id: "tracklist-section", key: "tracklist" },
        { id: "top-signals-section", key: "signals" },
        { id: "signals-section", key: "signals" },
        { id: "portfolio-section", key: "portfolio" },
        { id: "search-section", key: "home" },
      ];

      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sec.key);
          return;
        }
      }
      setActiveSection("home");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close overlays on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when modal/drawer is open
  useEffect(() => {
    if (isSearchOpen || isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen, isMenuOpen]);

  const scrollTo = (id: string, key: string) => {
    setActiveSection(key);
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 65;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. Mobile Top Header Controls Trigger (Search & Menu Buttons)  */}
      {/* Stays in the header navbar                                     */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 md:hidden">
        {/* Search button that opens search modal */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 shadow-sm transition active:scale-95 hover:border-zinc-700 hover:text-white"
          title="Hisse Ara"
          aria-label="Hisse Ara"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* Menu hamburger button */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 shadow-sm transition active:scale-95 hover:border-zinc-700 hover:text-white"
          title="Menü"
          aria-label="Menü"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. Portal to body: Modals, Drawers & Fixed Bottom Nav          */}
      {/* Teleported directly to body to escape header's backdrop-filter */}
      {/* ============================================================== */}
      {mounted &&
        createPortal(
          <>
            {/* Mobile Search Modal / Overlay */}
            {isSearchOpen && (
              <div className="fixed inset-0 z-[150] flex flex-col bg-zinc-950/98 backdrop-blur-2xl animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-xs text-sky-400">
                      🔍
                    </span>
                    <span className="text-sm font-bold text-zinc-100">BIST Şirket Ara</span>
                  </div>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white active:scale-95 transition"
                  >
                    <span>Kapat</span>
                    <span className="text-zinc-500 text-sm">✕</span>
                  </button>
                </div>

                {/* Search Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <BistCombobox
                    placeholder="Hisse kodu veya adı (THYAO, ASELS...)"
                    autoNavigate={true}
                    onSelect={() => setIsSearchOpen(false)}
                  />

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                      Popüler BIST Hisseleri
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "THYAO",
                        "ASELS",
                        "GARAN",
                        "EREGL",
                        "BIMAS",
                        "TUPRS",
                        "KCHOL",
                        "SISE",
                        "AKBNK",
                        "FROTO",
                      ].map((ticker) => (
                        <Link
                          key={ticker}
                          href={`/symbol/${ticker}.IS`}
                          onClick={() => setIsSearchOpen(false)}
                          className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 font-mono text-xs font-bold text-zinc-300 hover:border-sky-500/40 hover:text-sky-400 active:scale-95 transition"
                        >
                          {ticker}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Slide-Over Menu Drawer */}
            {isMenuOpen && (
              <div
                className="fixed inset-0 z-[140] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <div
                  className="flex h-full w-[85%] max-w-sm flex-col bg-zinc-950 border-l border-zinc-800 p-5 shadow-2xl animate-in slide-in-from-right duration-250"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 shadow-md">
                        <span className="text-xs font-black text-white">FA</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">Finans Asistanı</h3>
                        <span className="text-[10px] text-zinc-500">BIST Karar Destek & Analiz</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Quick Navigation Sections */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    <div>
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Hızlı Geçiş
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => scrollTo("search-section", "home")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">🏠</span>
                          <span>Ana Panel & Arama</span>
                        </button>
                        <button
                          onClick={() => scrollTo("portfolio-section", "portfolio")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">💼</span>
                          <span>Portföy Pozisyon Takibi</span>
                        </button>
                        <button
                          onClick={() => scrollTo("signals-section", "signals")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">⚡</span>
                          <span>Çoklu Periyot Sinyalleri</span>
                        </button>
                        <button
                          onClick={() => scrollTo("top-signals-section", "signals")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">🏆</span>
                          <span>Lider AL / SAT Sinyalleri</span>
                        </button>
                        <button
                          onClick={() => scrollTo("tracklist-section", "tracklist")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">📊</span>
                          <span>Sinyal Performansı</span>
                        </button>
                        <button
                          onClick={() => scrollTo("watchlist-section", "watchlist")}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                        >
                          <span className="text-base">⭐</span>
                          <span>İzleme Listesi (Watchlist)</span>
                        </button>
                      </div>
                    </div>

                    {/* Guides */}
                    <div className="border-t border-zinc-800/80 pt-3">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                        Kılavuzlar & Dökümanlar
                      </p>
                      <div className="space-y-1">
                        <Link
                          href="/kullanim-kilavuzu"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition"
                        >
                          <span className="text-base">📖</span>
                          <span>Kullanım Kılavuzu</span>
                        </Link>
                        <Link
                          href="/teknik-detay-klavuzu"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
                        >
                          <span className="text-base">📊</span>
                          <span>Teknik Detay Kılavuzu</span>
                        </Link>
                      </div>
                    </div>

                    {/* Market Status */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2 mb-1 text-emerald-400 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>09:50 - 18:00 Seans Taraması</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        15 dk aralıklarla BIST çoklu periyot taraması ve e-posta bildirimi yapılır.
                      </p>
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-600 text-center">
                    Finans Asistanı · Karar Destek Aracı
                  </div>
                </div>
              </div>
            )}

            {/* Sleek Mobile Bottom Navigation Bar (Fixed at bottom of screen) */}
            <nav
              className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-zinc-800/90 bg-zinc-950/95 px-2 py-1.5 backdrop-blur-xl md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.7)] pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]"
              aria-label="Mobil alt gezinme"
            >
              {/* Tab 1: Ana Sayfa / Arama */}
              <button
                onClick={() => scrollTo("search-section", "home")}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition active:scale-95 ${
                  activeSection === "home"
                    ? "text-sky-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-base">🏠</span>
                <span>Ana Panel</span>
              </button>

              {/* Tab 2: Portföy */}
              <button
                onClick={() => scrollTo("portfolio-section", "portfolio")}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition active:scale-95 ${
                  activeSection === "portfolio"
                    ? "text-emerald-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-base">💼</span>
                <span>Portföy</span>
              </button>

              {/* Tab 3: Quick Search Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex -mt-5 flex-col items-center justify-center group"
                aria-label="Hisse Arama"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 text-white shadow-xl shadow-sky-500/40 ring-4 ring-zinc-950 transition active:scale-90 group-hover:scale-105">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <span className="mt-0.5 text-[9px] font-semibold text-sky-400">Ara</span>
              </button>

              {/* Tab 4: Sinyaller */}
              <button
                onClick={() => scrollTo("signals-section", "signals")}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition active:scale-95 ${
                  activeSection === "signals"
                    ? "text-sky-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-base">⚡</span>
                <span>Sinyaller</span>
              </button>

              {/* Tab 5: Takip Listesi */}
              <button
                onClick={() => scrollTo("watchlist-section", "watchlist")}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition active:scale-95 ${
                  activeSection === "watchlist"
                    ? "text-amber-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-base">⭐</span>
                <span>Takip</span>
              </button>
            </nav>
          </>,
          document.body
        )}
    </>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import BistCombobox from "@/components/BistCombobox";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finans Asistanı · BIST Analiz & Karar Destek",
  description:
    "Borsa İstanbul hisseleri ve altın için teknik + temel analiz tabanlı AL/SAT/TUT karar destek aracı.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100 selection:bg-sky-500/30 selection:text-sky-200">
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-lg">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight text-zinc-100 transition hover:text-sky-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 shadow-md shadow-sky-500/20">
                <span className="text-xs font-black text-white">FA</span>
              </div>
              <span className="text-base sm:text-lg">Finans Asistanı</span>
            </Link>

            <div className="w-48 sm:w-64 md:w-80 lg:w-96">
              <BistCombobox compact placeholder="BIST hisse ara (⌘K)..." autoNavigate={true} />
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                09:50 - 18:00 Seans Taraması
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-zinc-800/80 bg-zinc-950/50">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
            <p>
              Veri kaynağı: Yahoo Finance · Karar destek aracıdır, yatırım tavsiyesi değildir.
            </p>
            <p className="text-[11px] text-zinc-600">
              15 dk çoklu zaman dilimi (1S, 2S, 4S, Haftalık, Aylık) AL/SAT taraması
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

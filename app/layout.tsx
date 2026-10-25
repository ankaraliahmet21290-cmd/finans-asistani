import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { ensureSchedulerStarted } from "@/lib/scheduler";
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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finans Asistanı",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  ensureSchedulerStarted();
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100 selection:bg-sky-500/30 selection:text-sky-200">
        <AnalyticsTracker />
        <AppHeader />

        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 md:pb-8">
          {children}
        </main>

        <footer className="border-t border-zinc-800/80 bg-zinc-950/50 pb-20 md:pb-4">
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

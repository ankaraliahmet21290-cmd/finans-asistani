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
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" className="font-semibold tracking-tight text-zinc-100 shrink-0 flex items-center gap-2 hover:text-sky-400 transition">
              <span className="flex h-2 w-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
              Finans Asistanı
            </Link>
            <div className="w-56 sm:w-72 md:w-80">
              <BistCombobox compact placeholder="Şirket ara (⌘K)..." autoNavigate={true} />
            </div>
            <span className="hidden md:inline-block text-xs text-zinc-500 shrink-0">
              Karar destek aracıdır · yatırım tavsiyesi değildir
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-zinc-800/80">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 text-xs text-zinc-600">
            Veri kaynağı: Yahoo Finance · Gecikmeli olabilir · Sinyaller geçmiş veriye dayanır.
          </div>
        </footer>
      </body>
    </html>
  );
}

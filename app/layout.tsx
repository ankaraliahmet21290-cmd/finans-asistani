import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Finans Asistanı",
  description:
    "Hisse ve altın için teknik + temel analiz tabanlı AL/SAT/TUT karar destek aracı.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800/80">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight text-zinc-100">
              Finans Asistanı
            </Link>
            <span className="text-xs text-zinc-500">
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

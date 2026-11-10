import type { Metadata } from "next";
import Link from "next/link";
import PositionTracker from "@/components/PositionTracker";

export const metadata: Metadata = {
  title: "Portföy & Pozisyon Takibi · Finans Asistanı",
  description:
    "BIST, Kripto, Emtia ve ABD hisselerinizde Stop-Loss ve Kâr Al seviyelerini takip edin, piyasa bazlı anlık canlı e-posta alarmları alın.",
};

export default function PositionsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumbs & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link href="/" className="hover:text-zinc-300 transition">
              Ana Sayfa
            </Link>
            <span>/</span>
            <span className="text-zinc-300 font-semibold">Portföy Takibi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <span className="text-2xl">💼</span>
            <span>Portföy Pozisyon Takibi & Canlı Alarm Masası</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Hangi periyotta hangi varlığı aldığınızı kaydedin. Fiyat Stop-Loss (🛑) veya Kâr Al (🎯) seviyelerine ulaştığında sistem piyasa bazlı bağımsız sıklıklarla otomatik e-posta alarmı gönderir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ayarlar"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            ⚙️ Alarm Ayarları
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            ← Ana Ekrana Dön
          </Link>
        </div>
      </div>

      {/* Main Position Tracker */}
      <PositionTracker />
    </div>
  );
}

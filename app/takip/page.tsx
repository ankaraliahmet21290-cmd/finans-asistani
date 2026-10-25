import type { Metadata } from "next";
import Link from "next/link";
import WatchlistTable from "@/components/WatchlistTable";

export const metadata: Metadata = {
  title: "İzleme / Takip Listesi Masası · Finans Asistanı",
  description:
    "BIST, Kripto, Emtia, Döviz ve ABD hisseleri kişisel izleme listesi, piyasa bazlı bağımsız sinyal kontrol sıklıkları ve çoklu zaman dilimi AL/SAT sinyalleri.",
};

export default function TakipPage() {
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
            <span className="text-zinc-300 font-semibold">İzleme Listesi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <span className="text-2xl">📌</span>
            <span>İzleme / Takip Listesi Masası</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tüm piyasalardaki varlıklarınızı tek ekranda izleyin. AL/SAT sinyal kontrol sıklıkları BIST, Kripto, Emtia ve ABD Borsası için birbirinden bağımsız olarak çalışır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ayarlar"
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
          >
            ⚙️ Takip Ayarları
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            ← Ana Ekrana Dön
          </Link>
        </div>
      </div>

      {/* Main Watchlist Table */}
      <WatchlistTable
        title="Tüm Piyasalar İzleme & Sinyal Takip Listesi"
        subtitle="watchlist.md dosyasından okunan ve arka plan zamanlayıcısı tarafından taranan varlıklar"
      />
    </div>
  );
}

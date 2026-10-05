"use client";

import { useState } from "react";
import BistCombobox from "./BistCombobox";
import SelectedCompanyPreview from "./SelectedCompanyPreview";
import TopSignals from "./TopSignals";
import TimeframeSignals from "./TimeframeSignals";
import WatchlistTable from "./WatchlistTable";
import { findBistCompany, type BistCompany } from "@/lib/bist";

const QUICK_CHIPS = [
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
];

export default function HomeDashboard() {
  const [selectedCompany, setSelectedCompany] = useState<BistCompany | null>(null);

  const handleChipClick = (code: string) => {
    const company = findBistCompany(code);
    if (company) {
      setSelectedCompany(company);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hero & Search Section */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            BIST Şirket Arama & Sinyal Analizi
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Tüm BIST Şirketleri & AL/SAT Sinyalleri
          </h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base">
            800+ Borsa İstanbul şirketini anında arayın, teknik indikatörler ve temel rasyolar ile hesaplanan karar destek skorlarını görüntüleyin.
          </p>

          {/* Searchable Combobox */}
          <div className="mt-5 w-full">
            <BistCombobox
              placeholder="BIST şirketi ara (kod veya ad: THYAO, Garanti, Ereğli, Aselsan...)"
              autoNavigate={false}
              onSelect={(company) => setSelectedCompany(company)}
            />
          </div>

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Hızlı erişim:</span>
            {QUICK_CHIPS.map((code) => {
              const isActive = selectedCompany?.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleChipClick(code)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition ${
                    isActive
                      ? "border-sky-500 bg-sky-500/20 text-sky-300"
                      : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected Company Preview (if selected via combobox or chips) */}
      {selectedCompany && (
        <SelectedCompanyPreview
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {/* Multi-Timeframe Categorized Signals (1h, 2h, 4h, 1wk, 1mo) with 15 min mail trigger */}
      <TimeframeSignals />

      {/* Top AL and SAT Signals Ranking */}
      <TopSignals />

      {/* Main Watchlist Table */}
      <section className="w-full">
        <WatchlistTable />
      </section>
    </div>
  );
}

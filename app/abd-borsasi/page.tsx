import type { Metadata } from "next";
import UsStocksDashboard from "@/components/UsStocksDashboard";

export const metadata: Metadata = {
  title: "Amerikan Borsası · S&P 500 & Nasdaq Hisseleri Karar Destek",
  description:
    "Nvidia, Apple, Microsoft, Tesla ve ABD devleri için Wall Street analist hedef fiyatları, konsensüs tavsiyeleri, F/K, PEG ve teknik AL/SAT sinyalleri.",
};

export default function UsStocksPage() {
  return <UsStocksDashboard />;
}

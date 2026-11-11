import type { Metadata } from "next";
import TradingViewTerminal from "./TradingViewTerminal";

export const metadata: Metadata = {
  title: "TradingView Canlı Terminali · Finans Asistanı",
  description:
    "Borsa İstanbul (BIST), Amerikan Borsası (NYSE/NASDAQ), Kripto Paralar, Altın, Emtia ve Döviz için gelişmiş canlı TradingView grafikleri ve teknik analiz osilatör ibresi.",
};

interface TradingViewPageProps {
  searchParams: Promise<{ symbol?: string; tf?: string }>;
}

export default async function TradingViewPage({ searchParams }: TradingViewPageProps) {
  const params = await searchParams;
  const initialSymbol = params?.symbol || "THYAO.IS";
  const initialTf = params?.tf || "1d";

  return <TradingViewTerminal initialSymbol={initialSymbol} initialTf={initialTf} />;
}

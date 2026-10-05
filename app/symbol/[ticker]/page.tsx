import type { Metadata } from "next";
import SymbolDetail from "@/components/SymbolDetail";
import { decodeTicker, resolveType } from "@/lib/watchlist";
import { findBistCompany } from "@/lib/bist";

interface SymbolPageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: SymbolPageProps): Promise<Metadata> {
  const { ticker: raw } = await params;
  const decoded = decodeTicker(raw);
  const bist = findBistCompany(decoded);
  const titleTicker = bist ? bist.ticker : decoded;
  return { title: `${titleTicker} · Finans Asistanı` };
}

export default async function SymbolPage({ params }: SymbolPageProps) {
  const { ticker: raw } = await params;
  let ticker = decodeTicker(raw);
  const bist = findBistCompany(ticker);
  if (bist && !ticker.endsWith(".IS")) {
    ticker = bist.ticker;
  }
  const type = resolveType(ticker);

  return <SymbolDetail ticker={ticker} type={type} />;
}

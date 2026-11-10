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

  if (ticker.startsWith("BIST:")) {
    ticker = ticker.replace(/^BIST:/i, "");
  }

  const bist = findBistCompany(ticker);
  if (bist) {
    ticker = bist.ticker;
  } else if (!ticker.includes(".") && !ticker.includes("=") && !ticker.includes("-") && /^[A-Z]{4,5}$/.test(ticker)) {
    ticker = `${ticker}.IS`;
  }

  const type = resolveType(ticker);

  return <SymbolDetail ticker={ticker} type={type} />;
}

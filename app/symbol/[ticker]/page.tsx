import type { Metadata } from "next";
import SymbolDetail from "@/components/SymbolDetail";
import { decodeTicker, resolveType } from "@/lib/watchlist";
import { findBistCompany } from "@/lib/bist";
import { findUsStockAsset } from "@/lib/us-stock-assets";
import { findCryptoAsset } from "@/lib/crypto-assets";

interface SymbolPageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: SymbolPageProps): Promise<Metadata> {
  const { ticker: raw } = await params;
  const decoded = decodeTicker(raw);
  const bist = findBistCompany(decoded);
  const usStock = findUsStockAsset(decoded);
  const crypto = findCryptoAsset(decoded);
  const titleTicker = bist?.ticker || usStock?.ticker || crypto?.ticker || decoded;
  return { title: `${titleTicker} · Finans Asistanı` };
}

export default async function SymbolPage({ params }: SymbolPageProps) {
  const { ticker: raw } = await params;
  let ticker = decodeTicker(raw);
  const isExplicitBist = ticker.startsWith("BIST:");

  if (ticker.startsWith("BIST:")) {
    ticker = ticker.replace(/^BIST:/i, "");
  }

  const bist = findBistCompany(ticker);
  const usStock = findUsStockAsset(ticker);
  const crypto = findCryptoAsset(ticker);

  if (bist) {
    ticker = bist.ticker;
  } else if (isExplicitBist && !ticker.endsWith(".IS")) {
    ticker = `${ticker}.IS`;
  } else if (usStock) {
    ticker = usStock.ticker;
  } else if (crypto) {
    ticker = crypto.ticker;
  }

  const type = resolveType(ticker);

  return <SymbolDetail ticker={ticker} type={type} />;
}

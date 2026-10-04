import type { Metadata } from "next";
import SymbolDetail from "@/components/SymbolDetail";
import { decodeTicker, resolveType } from "@/lib/watchlist";

interface SymbolPageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: SymbolPageProps): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${decodeTicker(ticker)} · Finans Asistanı` };
}

export default async function SymbolPage({ params }: SymbolPageProps) {
  const { ticker: raw } = await params;
  const ticker = decodeTicker(raw);
  const type = resolveType(ticker);

  return <SymbolDetail ticker={ticker} type={type} />;
}

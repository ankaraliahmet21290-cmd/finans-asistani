import type { Metadata } from "next";
import CryptoDashboard from "@/components/CryptoDashboard";

export const metadata: Metadata = {
  title: "Kripto Para · Bitcoin, Ethereum, Solana AL/SAT Sinyalleri",
  description:
    "Bitcoin, Ethereum, Solana ve popüler kripto paralar için 7/24 kesintisiz Supertrend, Stoch RSI ve on-chain likidite karar destek aracı.",
};

export default function CryptoPage() {
  return <CryptoDashboard />;
}

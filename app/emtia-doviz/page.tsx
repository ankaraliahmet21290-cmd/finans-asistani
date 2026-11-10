import type { Metadata } from "next";
import CommoditiesForexDashboard from "@/components/CommoditiesForexDashboard";

export const metadata: Metadata = {
  title: "Emtia & Döviz · Altın, Gümüş, Dolar/TL Karar Destek",
  description:
    "Ons & Gram Altın, Gümüş, USD/TRY, EUR/TRY ve Brent Petrol için Pivot destek/direnç seviyeleri, DXY korelasyonu ve AL/SAT sinyalleri.",
};

export default function CommoditiesForexPage() {
  return <CommoditiesForexDashboard />;
}

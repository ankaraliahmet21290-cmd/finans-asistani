import type { Metadata } from "next";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Ziyaretçi & Ekran Tıklama Analitiği · Finans Asistanı",
  description:
    "Uygulamayı kullananların IP adresleri ve ekran tıklama sayılarının anlık, saatlik, haftalık ve aylık analizi.",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <AnalyticsDashboard />
    </div>
  );
}

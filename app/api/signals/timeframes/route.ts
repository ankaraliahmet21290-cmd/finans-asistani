import { NextResponse } from "next/server";
import { getCachedScanAsync, readDiskCache, scanCategorizedSignals } from "@/lib/multitimeframe";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { getIndexTypeSettingsFromFile } from "@/lib/index-type-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";
  const market = searchParams.get("market"); // "crypto" | "us_stocks" | "commodity_forex"

  ensureSchedulerStarted();

  let targetKey: string = "";
  if (market === "crypto" || market === "us_stocks" || market === "commodity_forex") {
    targetKey = market;
  } else {
    const { multiTimeframe: indexType } = await getIndexTypeSettingsFromFile();
    targetKey = indexType;
  }

  if (!force) {
    const cached = await getCachedScanAsync(targetKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const data = await scanCategorizedSignals(targetKey);
    return NextResponse.json(data);
  } catch (e) {
    // Tarama başarısız olsa bile diskteki eski önbellek varsa onu kurtarma olarak dön
    const fallback = await readDiskCache(targetKey);
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zaman dilimi analizi yapılamadı" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { getCachedScanAsync, readDiskCache, scanCategorizedSignals } from "@/lib/multitimeframe";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { getIndexTypeSettingsFromFile } from "@/lib/index-type-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  ensureSchedulerStarted();

  const { multiTimeframe: indexType } = await getIndexTypeSettingsFromFile();

  if (!force) {
    const cached = await getCachedScanAsync(indexType);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const data = await scanCategorizedSignals(indexType);
    return NextResponse.json(data);
  } catch (e) {
    // Tarama başarısız olsa bile diskteki eski önbellek varsa onu kurtarma olarak dön
    const fallback = await readDiskCache(indexType);
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zaman dilimi analizi yapılamadı" },
      { status: 500 }
    );
  }
}


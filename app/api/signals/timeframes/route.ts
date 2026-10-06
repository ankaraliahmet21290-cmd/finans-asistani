import { NextResponse } from "next/server";
import { scanCategorizedSignals, type CategorizedSignals } from "@/lib/multitimeframe";
import { ensureSchedulerStarted } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

let cachedTfData: CategorizedSignals | null = null;
let lastScanAt = 0;
const TF_CACHE_MS = 30 * 1000; // 30 seconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";
  const now = Date.now();

  ensureSchedulerStarted();

  if (!force && cachedTfData && now - lastScanAt < TF_CACHE_MS) {
    return NextResponse.json(cachedTfData);
  }

  try {
    const data = await scanCategorizedSignals();
    cachedTfData = data;
    lastScanAt = Date.now();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zaman dilimi analizi yapılamadı" },
      { status: 500 }
    );
  }
}

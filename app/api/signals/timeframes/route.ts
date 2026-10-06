import { NextResponse } from "next/server";
import { getCachedScan, scanCategorizedSignals } from "@/lib/multitimeframe";
import { ensureSchedulerStarted } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  ensureSchedulerStarted();

  if (!force) {
    const cached = getCachedScan();
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const data = await scanCategorizedSignals();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zaman dilimi analizi yapılamadı" },
      { status: 500 }
    );
  }
}


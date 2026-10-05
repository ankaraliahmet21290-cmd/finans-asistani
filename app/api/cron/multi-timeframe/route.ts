import { NextResponse } from "next/server";
import { ensureSchedulerStarted, getSchedulerState, runScheduledScan } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const force = searchParams.get("force") === "true";

  // Auto-start scheduler if not yet started
  ensureSchedulerStarted();

  if (action === "status") {
    return NextResponse.json(getSchedulerState());
  }

  // Trigger manual or cron scan
  const result = await runScheduledScan(force);
  return NextResponse.json({
    ...result,
    scheduler: getSchedulerState(),
  });
}

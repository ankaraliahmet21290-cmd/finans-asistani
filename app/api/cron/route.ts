import { NextResponse } from "next/server";
import { analyzeSymbol } from "@/lib/analyze";
import { sendSignalMail } from "@/lib/mail";
import { getPendingMail, getSignal, setPendingMail, setSignal } from "@/lib/store";
import { WATCHLIST } from "@/lib/watchlist";
import type { SignalMailItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results: { ticker: string; signal: string; score: number }[] = [];
  const errors: { ticker: string; error: string }[] = [];
  const changed: SignalMailItem[] = [];

  for (const w of WATCHLIST) {
    try {
      const res = await analyzeSymbol(w.ticker, w.type);

      const fundReasons = res.fund?.metrics
        .filter((m) => m.point !== 0)
        .map((m) => m.detail) ?? [];

      const prev = await getSignal(w.ticker);
      if (prev !== res.signal) {
        await setSignal(w.ticker, res.signal);
        if (prev) {
          changed.push({
            ticker: w.ticker,
            signal: res.signal,
            score: res.score,
            reasons: [...res.tech.reasons, ...fundReasons],
            price: res.price,
          });
        }
      }

      results.push({ ticker: w.ticker, signal: res.signal, score: res.score });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ ticker: w.ticker, error: message });
      console.error("[cron] sembol atlandı:", w.ticker, e);
    }
  }

  const queue = new Map<string, SignalMailItem>();
  for (const item of await getPendingMail()) queue.set(item.ticker, item);
  for (const item of changed) queue.set(item.ticker, item);
  const items = [...queue.values()];

  let mailed = false;
  if (items.length > 0) {
    try {
      mailed = await sendSignalMail(items);
      await setPendingMail([]);
    } catch (e) {
      console.error("[cron] e-posta gönderilemedi, bir sonraki çalıştırmada tekrar denenecek:", e);
      await setPendingMail(items);
    }
  }

  return NextResponse.json({
    checked: WATCHLIST.length,
    ok: results.length,
    changed: changed.length,
    mailed,
    results,
    errors,
  });
}

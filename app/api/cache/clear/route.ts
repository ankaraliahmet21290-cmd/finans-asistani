import { NextResponse } from "next/server";
import { clearDataCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    clearDataCache();
    return NextResponse.json({
      ok: true,
      message: "Veri önbelleği başarıyla temizlendi.",
      clearedAt: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Önbellek temizlenemedi: ${error}` },
      { status: 500 }
    );
  }
}

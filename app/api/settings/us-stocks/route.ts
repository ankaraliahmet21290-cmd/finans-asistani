import { NextResponse } from "next/server";
import {
  getUsStockSettingsFromFile,
  saveUsStockSettingsToFile,
  normalizeUsStockSector,
} from "@/lib/us-stock-settings-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getUsStockSettingsFromFile();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar okunamadı" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sector = body.sector || body.defaultSector;

    if (!sector || typeof sector !== "string") {
      return NextResponse.json({ ok: false, error: "Sektör belirtilmedi" }, { status: 400 });
    }

    const normalized = normalizeUsStockSector(sector);
    const saved = await saveUsStockSettingsToFile({ defaultSector: normalized });

    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

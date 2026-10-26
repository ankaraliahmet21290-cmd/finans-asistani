import { NextResponse } from "next/server";
import {
  getBistSettingsFromFile,
  saveBistSettingsToFile,
  normalizeBistSector,
} from "@/lib/bist-settings-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getBistSettingsFromFile();
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
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Geçersiz JSON gövdesi" },
        { status: 400 }
      );
    }

    const sector = (body.sector || body.defaultSector) as string | undefined;
    const analystFilterMode = body.analystFilterMode;

    const updates: Record<string, unknown> = {};

    if (sector && typeof sector === "string") {
      updates.defaultSector = normalizeBistSector(sector);
    }

    if (analystFilterMode === "leaders" || analystFilterMode === "top_upside") {
      updates.analystFilterMode = analystFilterMode;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Geçerli bir ayar belirtilmedi" }, { status: 400 });
    }

    const saved = await saveBistSettingsToFile(updates);

    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

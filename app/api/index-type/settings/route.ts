import { NextResponse } from "next/server";
import {
  getIndexTypeSettingsFromFile,
  saveIndexTypeSettingsToFile,
  type IndexTypeSettingsConfig,
} from "@/lib/index-type-storage";
import { normalizeIndexTypeKey } from "@/lib/index-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getIndexTypeSettingsFromFile();
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
    const updates: Partial<Pick<IndexTypeSettingsConfig, "multiTimeframe" | "topSignals">> = {};

    if (body.panel === "multiTimeframe" && body.indexType) {
      updates.multiTimeframe = normalizeIndexTypeKey(body.indexType);
    } else if (body.panel === "topSignals" && body.indexType) {
      updates.topSignals = normalizeIndexTypeKey(body.indexType);
    } else {
      return NextResponse.json({ ok: false, error: "Geçersiz panel veya endeks" }, { status: 400 });
    }

    const saved = await saveIndexTypeSettingsToFile(updates);
    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

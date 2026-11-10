import { NextResponse } from "next/server";
import {
  getCryptoSettingsFromFile,
  saveCryptoSettingsToFile,
  normalizeCryptoCategory,
} from "@/lib/crypto-settings-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCryptoSettingsFromFile();
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
    const category = body.category || body.defaultCategory;

    if (!category || typeof category !== "string") {
      return NextResponse.json({ ok: false, error: "Kategori belirtilmedi" }, { status: 400 });
    }

    const normalized = normalizeCryptoCategory(category);
    const saved = await saveCryptoSettingsToFile({ defaultCategory: normalized });

    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readTracklist, addToTracklist, removeFromTracklist, TrackEntry } from "@/lib/tracklist";

export async function GET() {
  try {
    const list = await readTracklist();
    return NextResponse.json({ ok: true, tracklist: list });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Liste okunamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticker, type, price, signal, timeframe } = body;
    if (!ticker || !type || price == null || !signal) {
      return NextResponse.json({ ok: false, error: "Eksik parametreler" }, { status: 400 });
    }

    const date = new Date().toISOString(); // Islem tarihi ve saati
    const tf = timeframe || "1d";
    const entry: TrackEntry = { ticker, type, date, price, signal, timeframe: tf };
    await addToTracklist(entry);

    const updated = await readTracklist();
    return NextResponse.json({ ok: true, tracklist: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker");
    const date = url.searchParams.get("date");
    if (!ticker || !date) {
      return NextResponse.json({ ok: false, error: "Ticker veya date parametresi eksik" }, { status: 400 });
    }

    await removeFromTracklist(ticker, date);

    const updated = await readTracklist();
    return NextResponse.json({ ok: true, tracklist: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Silinemedi" }, { status: 500 });
  }
}

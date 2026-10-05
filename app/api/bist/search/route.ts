import { NextResponse } from "next/server";
import { searchBistCompanies } from "@/lib/bist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20;

  const results = searchBistCompanies(q, limit);
  return NextResponse.json({ results });
}

import { NextResponse } from "next/server";
import { readFormToggleState } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public read-only snapshot of per-form gates for client-side modal gating. */
export async function GET() {
  const forms = await readFormToggleState();
  return NextResponse.json({ ok: true, forms });
}

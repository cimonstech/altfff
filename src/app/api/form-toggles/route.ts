import { NextResponse } from "next/server";
import { tryReadFormToggleState } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Public read-only snapshot of per-form gates for client-side display gating. */
export async function GET() {
  const forms = await tryReadFormToggleState();
  if (!forms) {
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, forms }, { headers: NO_STORE });
}

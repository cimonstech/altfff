import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
};

/** Any authenticated admin_profiles row — not super_admin-only. */
export async function requireAdmin():
  Promise<{ user: AdminUser } | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };
  }

  return { user: { id: user.id, email: user.email } };
}

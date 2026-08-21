import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { reportServerError } from "@/lib/sentryReport";
import { WALK_IN_REGISTRATION_SETTING_KEY } from "@/lib/appSettings";

export const runtime = "nodejs";

type SettingRow = {
  value: boolean;
  updated_at: string;
  updated_by_email: string | null;
};

async function loadSetting(supabase: Awaited<ReturnType<typeof createClient>>): Promise<
  { row: SettingRow } | { error: NextResponse }
> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at, updated_by_email")
    .eq("key", WALK_IN_REGISTRATION_SETTING_KEY)
    .single();

  if (error || !data) {
    console.error("Failed to load walk-in registration setting:", error);
    return {
      error: NextResponse.json({ ok: false, error: "Could not load walk-in registration setting." }, { status: 500 }),
    };
  }

  return { row: data as SettingRow };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabase = await createClient();
  const loaded = await loadSetting(supabase);
  if ("error" in loaded) return loaded.error;

  return NextResponse.json({
    ok: true,
    enabled: loaded.row.value,
    updatedAt: loaded.row.updated_at,
    updatedByEmail: loaded.row.updated_by_email,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: { enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "Please provide enabled: true or false." }, { status: 400 });
  }

  const supabase = await createClient();
  const loaded = await loadSetting(supabase);
  if ("error" in loaded) return loaded.error;

  const previousEnabled = loaded.row.value;
  const enabled = body.enabled;
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("app_settings")
    .update({
      value: enabled,
      updated_at: now,
      updated_by: auth.user.id,
      updated_by_email: auth.user.email,
    })
    .eq("key", WALK_IN_REGISTRATION_SETTING_KEY)
    .select("value, updated_at, updated_by_email")
    .single();

  if (updateError || !updated) {
    console.error("Failed to update walk-in registration setting:", updateError);
    reportServerError(updateError, {
      route: "/api/admin/settings/walk-in-registration",
      kind: "admin",
      extra: { op: "update_setting" },
    });
    return NextResponse.json({ ok: false, error: "Failed to update setting." }, { status: 500 });
  }

  const { error: logError } = await supabase.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: "walk_in_registration_toggled",
    target_table: "app_settings",
    target_id: null,
    details: {
      key: WALK_IN_REGISTRATION_SETTING_KEY,
      enabled,
      previous_enabled: previousEnabled,
    },
  });

  if (logError) {
    console.error("Failed to log walk-in registration toggle:", logError);
    reportServerError(logError, {
      route: "/api/admin/settings/walk-in-registration",
      kind: "admin",
      extra: { op: "activity_log" },
    });
  }

  return NextResponse.json({
    ok: true,
    enabled: updated.value,
    updatedAt: updated.updated_at,
    updatedByEmail: updated.updated_by_email,
  });
}

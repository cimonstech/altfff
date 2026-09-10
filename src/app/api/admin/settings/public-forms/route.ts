import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminAuth";
import { canUpdatePublicFormsToggle, getAuthenticatedUserEmail } from "@/lib/publicFormsAuth";
import { reportServerError } from "@/lib/sentryReport";
import {
  FORM_TOGGLE_FORMS,
  FORM_TOGGLE_LABELS,
  type FormToggleForm,
  formToggleActivityAction,
  formToggleSettingKey,
  isFormToggleForm,
} from "@/lib/formToggles";

export const runtime = "nodejs";

type SettingRow = {
  value: boolean;
  updated_at: string;
  updated_by_email: string | null;
};

type FormTogglePayload = {
  enabled: boolean;
  updatedAt: string;
  updatedByEmail: string | null;
};

function forbiddenToggleAccess(): NextResponse {
  return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
}

async function loadAllSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ rows: Record<FormToggleForm, SettingRow> } | { error: NextResponse }> {
  const keys = FORM_TOGGLE_FORMS.map((form) => formToggleSettingKey(form));
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, updated_at, updated_by_email")
    .in("key", keys);

  if (error || !data) {
    console.error("Failed to load form toggle settings:", error);
    return {
      error: NextResponse.json({ ok: false, error: "Could not load form toggle settings." }, { status: 500 }),
    };
  }

  const byKey = new Map(data.map((row) => [row.key, row as SettingRow & { key: string }]));
  const rows = {} as Record<FormToggleForm, SettingRow>;

  for (const form of FORM_TOGGLE_FORMS) {
    const row = byKey.get(formToggleSettingKey(form));
    if (!row) {
      console.error(`Missing app_settings row for ${formToggleSettingKey(form)}`);
      return {
        error: NextResponse.json({ ok: false, error: "Could not load form toggle settings." }, { status: 500 }),
      };
    }
    rows[form] = row;
  }

  return { rows };
}

function serializeFormToggle(form: FormToggleForm, row: SettingRow): FormTogglePayload {
  return {
    enabled: row.value,
    updatedAt: row.updated_at,
    updatedByEmail: row.updated_by_email,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!(await canUpdatePublicFormsToggle(auth.user.id))) return forbiddenToggleAccess();

  const supabase = await createClient();
  const loaded = await loadAllSettings(supabase);
  if ("error" in loaded) return loaded.error;

  return NextResponse.json({
    ok: true,
    forms: Object.fromEntries(
      FORM_TOGGLE_FORMS.map((form) => [form, serializeFormToggle(form, loaded.rows[form])]),
    ),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (!(await canUpdatePublicFormsToggle(auth.user.id))) return forbiddenToggleAccess();

  let body: { form?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!isFormToggleForm(body.form)) {
    return NextResponse.json(
      { ok: false, error: "Please provide form: sponsor, exhibitor, or visit." },
      { status: 400 },
    );
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "Please provide enabled: true or false." }, { status: 400 });
  }

  const form = body.form;
  const settingKey = formToggleSettingKey(form);
  const supabase = await createClient();

  const { data: current, error: loadError } = await supabase
    .from("app_settings")
    .select("value, updated_at, updated_by_email")
    .eq("key", settingKey)
    .single();

  if (loadError || !current) {
    console.error(`Failed to load ${settingKey}:`, loadError);
    return NextResponse.json({ ok: false, error: "Could not load form toggle setting." }, { status: 500 });
  }

  const previousEnabled = current.value;
  const enabled = body.enabled;
  const now = new Date().toISOString();
  const label = FORM_TOGGLE_LABELS[form];
  const actorEmail = (await getAuthenticatedUserEmail(auth.user.id)) ?? auth.user.email;

  const { data: updated, error: updateError } = await supabase
    .from("app_settings")
    .update({
      value: enabled,
      updated_at: now,
      updated_by: auth.user.id,
      updated_by_email: actorEmail,
    })
    .eq("key", settingKey)
    .select("value, updated_at, updated_by_email")
    .single();

  if (updateError || !updated) {
    console.error(`Failed to update ${settingKey}:`, updateError);
    reportServerError(updateError, {
      route: "/api/admin/settings/public-forms",
      kind: "admin",
      extra: { op: "update_setting", form },
    });
    return NextResponse.json({ ok: false, error: "Failed to update setting." }, { status: 500 });
  }

  const { error: logError } = await supabase.from("activity_logs").insert({
    actor_id: auth.user.id,
    actor_email: actorEmail,
    action: formToggleActivityAction(form),
    target_table: "app_settings",
    target_id: null,
    details: {
      form,
      key: settingKey,
      enabled,
      previous_enabled: previousEnabled,
    },
  });

  if (logError) {
    console.error(`Failed to log ${label} toggle:`, logError);
    reportServerError(logError, {
      route: "/api/admin/settings/public-forms",
      kind: "admin",
      extra: { op: "activity_log", form },
    });
  }

  return NextResponse.json({
    ok: true,
    form,
    ...serializeFormToggle(form, updated as SettingRow),
  });
}

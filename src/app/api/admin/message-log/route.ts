import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

const ROW_LIMIT = 500;

type MessageLogRow = {
  id: string;
  channel: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message_type: string;
  subject_or_summary: string | null;
  related_table: string | null;
  related_id: string | null;
  status: string;
  error_detail: string | null;
  sent_at: string;
};

type NeverReceivedRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  entity_table: string;
};

function parseDateStart(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseDateEnd(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "log";
  const channel = url.searchParams.get("channel") ?? "all";
  const status = url.searchParams.get("status") ?? "all";
  const messageType = url.searchParams.get("messageType") ?? "all";
  const dateFrom = parseDateStart(url.searchParams.get("dateFrom"));
  const dateTo = parseDateEnd(url.searchParams.get("dateTo"));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const entityTable = url.searchParams.get("entityTable") ?? "visitor_registrations";
  const personEmail = url.searchParams.get("personEmail")?.trim() ?? "";

  const admin = createAdminClient();

  if (view === "never_received") {
    const table = entityTable === "exhibitor_applications" ? "exhibitor_applications" : "visitor_registrations";
    const { data: entities, error: entitiesError } = await admin
      .from(table)
      .select("id, email, full_name, phone, status, created_at")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (entitiesError) {
      reportServerError(entitiesError, {
        route: "/api/admin/message-log",
        kind: "db",
        extra: { op: "never_received_entities" },
      });
      return NextResponse.json({ ok: false, error: "Failed to load registrations." }, { status: 500 });
    }

    const emails = (entities ?? [])
      .map((row) => (typeof row.email === "string" ? normalizeEmail(row.email) : ""))
      .filter(Boolean);

    const { data: loggedEmails, error: loggedError } = await admin
      .from("message_log")
      .select("recipient_email")
      .in("recipient_email", emails.length > 0 ? emails : ["__none__"]);

    if (loggedError) {
      reportServerError(loggedError, {
        route: "/api/admin/message-log",
        kind: "db",
        extra: { op: "never_received_log" },
      });
      return NextResponse.json({ ok: false, error: "Failed to load message log." }, { status: 500 });
    }

    const emailedSet = new Set(
      (loggedEmails ?? [])
        .map((row) => (typeof row.recipient_email === "string" ? normalizeEmail(row.recipient_email) : ""))
        .filter(Boolean),
    );

    let rows: NeverReceivedRow[] = (entities ?? [])
      .filter((row) => {
        const email = typeof row.email === "string" ? normalizeEmail(row.email) : "";
        return email && !emailedSet.has(email);
      })
      .map((row) => ({
        id: row.id as string,
        email: row.email as string,
        full_name: (row.full_name as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        status: row.status as string,
        created_at: row.created_at as string,
        entity_table: table,
      }));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.email.toLowerCase().includes(q) ||
          (row.full_name?.toLowerCase().includes(q) ?? false) ||
          (row.phone?.includes(q) ?? false),
      );
    }

    return NextResponse.json({ ok: true, view, rows: rows.slice(0, ROW_LIMIT) });
  }

  if (view === "person_history") {
    if (!personEmail) {
      return NextResponse.json({ ok: false, error: "personEmail is required for person history." }, { status: 400 });
    }

    const emailNorm = normalizeEmail(personEmail);
    let query = admin
      .from("message_log")
      .select(
        "id, channel, recipient_email, recipient_phone, recipient_name, message_type, subject_or_summary, related_table, related_id, status, error_detail, sent_at",
      )
      .eq("recipient_email", emailNorm)
      .order("sent_at", { ascending: false })
      .limit(ROW_LIMIT);

    if (dateFrom) query = query.gte("sent_at", dateFrom);
    if (dateTo) query = query.lte("sent_at", dateTo);
    if (channel === "email" || channel === "sms") query = query.eq("channel", channel);
    if (status === "sent" || status === "failed" || status === "quota_exceeded") {
      query = query.eq("status", status);
    }
    if (messageType !== "all") query = query.eq("message_type", messageType);

    const { data, error } = await query;
    if (error) {
      reportServerError(error, {
        route: "/api/admin/message-log",
        kind: "db",
        extra: { op: "person_history" },
      });
      return NextResponse.json({ ok: false, error: "Failed to load person history." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, view, rows: (data ?? []) as MessageLogRow[] });
  }

  let query = admin
    .from("message_log")
    .select(
      "id, channel, recipient_email, recipient_phone, recipient_name, message_type, subject_or_summary, related_table, related_id, status, error_detail, sent_at",
    )
    .order("sent_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (channel === "email" || channel === "sms") query = query.eq("channel", channel);
  if (status === "sent" || status === "failed" || status === "quota_exceeded") {
    query = query.eq("status", status);
  }
  if (messageType !== "all") query = query.eq("message_type", messageType);
  if (dateFrom) query = query.gte("sent_at", dateFrom);
  if (dateTo) query = query.lte("sent_at", dateTo);

  if (search) {
    const escaped = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `recipient_email.ilike.%${escaped}%,recipient_name.ilike.%${escaped}%,recipient_phone.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    reportServerError(error, {
      route: "/api/admin/message-log",
      kind: "db",
      extra: { op: "log_list" },
    });
    return NextResponse.json({ ok: false, error: "Failed to load message log." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, view: "log", rows: (data ?? []) as MessageLogRow[] });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminUser } from "@/lib/adminAuth";
import { formatCheckInTime, visitorDisplayName } from "@/lib/visitorVetting";
import { buildDoorWelcomeSms, sendSms } from "@/lib/sms";
import { MESSAGE_TYPES } from "@/lib/messageLog";
import { reportServerError } from "@/lib/sentryReport";

export type CheckInMethod = "qr" | "manual_lookup";

export type CheckInVisitor = {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  status: string;
  source?: string | null;
  checked_in_at: string | null;
  checked_in_by_email: string | null;
};

export type CheckInResultBody = {
  ok: boolean;
  result: string;
  message: string;
  name?: string;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
};

export type CheckInOutcome = {
  httpStatus: number;
  body: CheckInResultBody;
};

const VISITOR_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVisitorId(value: string): boolean {
  return VISITOR_ID_RE.test(value);
}

type CheckInRpcRow = {
  success: boolean;
  message: string;
  visitor_name: string | null;
};

function firstRpcRow(data: unknown): CheckInRpcRow | null {
  if (Array.isArray(data)) {
    const row = data[0];
    if (!row || typeof row !== "object") return null;
    return row as CheckInRpcRow;
  }
  if (data && typeof data === "object" && "success" in data) {
    return data as CheckInRpcRow;
  }
  return null;
}

/**
 * Single check-in write used by both QR/token scans and manual name/email
 * lookup. Always goes through perform_visitor_checkin() so the single-use
 * guard and field-narrow write live in one place for every role.
 */
export async function performVisitorCheckIn(
  supabase: SupabaseClient,
  actor: AdminUser,
  visitor: CheckInVisitor,
  method: CheckInMethod,
): Promise<CheckInOutcome> {
  const name = visitorDisplayName(visitor);

  if (visitor.status === "declined") {
    return {
      httpStatus: 200,
      body: { ok: false, result: "declined", message: "This registration was declined.", name },
    };
  }

  if (visitor.status === "registered") {
    return {
      httpStatus: 200,
      body: {
        ok: false,
        result: "pending",
        message: "Not approved yet - pending admin review.",
        name,
      },
    };
  }

  if (visitor.status === "cancelled") {
    return {
      httpStatus: 200,
      body: { ok: false, result: "cancelled", message: "This registration was cancelled.", name },
    };
  }

  if (visitor.checked_in_at) {
    return alreadyCheckedIn(name, visitor.checked_in_at, visitor.checked_in_by_email);
  }

  if (visitor.status !== "confirmed") {
    return {
      httpStatus: 200,
      body: {
        ok: false,
        result: "invalid",
        message: "This visitor cannot be checked in.",
        name,
      },
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("perform_visitor_checkin", {
    registration_id: visitor.id,
  });

  if (rpcError) {
    console.error("Check-in RPC failed:", rpcError);
    return {
      httpStatus: 500,
      body: { ok: false, result: "error", message: "Check-in failed. Try again." },
    };
  }

  const row = firstRpcRow(rpcData);
  if (!row) {
    console.error("Check-in RPC returned no row:", rpcData);
    return {
      httpStatus: 500,
      body: { ok: false, result: "error", message: "Check-in failed. Try again." },
    };
  }

  if (!row.success) {
    const { data: again } = await supabase
      .from("visitor_registrations")
      .select("full_name, email, checked_in_at, checked_in_by_email")
      .eq("id", visitor.id)
      .maybeSingle();
    if (again?.checked_in_at) {
      return alreadyCheckedIn(
        visitorDisplayName(again),
        again.checked_in_at,
        again.checked_in_by_email,
      );
    }
    return {
      httpStatus: 200,
      body: {
        ok: false,
        result: "invalid",
        message: row.message || "This visitor cannot be checked in.",
        name: row.visitor_name || name,
      },
    };
  }

  const { data: updated } = await supabase
    .from("visitor_registrations")
    .select("full_name, email, checked_in_at")
    .eq("id", visitor.id)
    .maybeSingle();

  const { error: logError } = await supabase.from("activity_logs").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action: "visitor_checked_in",
    target_table: "visitor_registrations",
    target_id: visitor.id,
    details: {
      method,
      email: visitor.email,
      name: visitor.full_name,
    },
  });
  if (logError) {
    console.error("Failed to log visitor check-in:", logError);
  }

  return {
    httpStatus: 200,
    body: {
      ok: true,
      result: "checked_in",
      message: row.message || "Checked in successfully.",
      name: row.visitor_name || visitorDisplayName(updated ?? visitor),
      checkedInAt: updated?.checked_in_at ?? new Date().toISOString(),
    },
  };
}

function alreadyCheckedIn(
  name: string,
  checkedInAt: string,
  checkedInBy: string | null,
): CheckInOutcome {
  return {
    httpStatus: 200,
    body: {
      ok: false,
      result: "already_checked_in",
      message: `Already checked in at ${formatCheckInTime(checkedInAt)}.`,
      name,
      checkedInAt,
      checkedInBy,
    },
  };
}

export function escapeCheckInSearch(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[,()]/g, " ");
}

export function buildCheckInWelcomeSms(fullName: string | null | undefined): string {
  return buildDoorWelcomeSms(fullName);
}

/** Fail-open welcome SMS for pre-registered door check-in. Walk-ins already got one at registration. */
export async function sendCheckInWelcomeSms(visitor: CheckInVisitor): Promise<void> {
  if (visitor.source === "walk_in") return;
  const phone = visitor.phone?.trim();
  if (!phone) return;

  try {
    const result = await sendSms(phone, buildCheckInWelcomeSms(visitor.full_name), "AltFFF Check-in Welcome", {
      messageType: MESSAGE_TYPES.checkInWelcomeSms,
      recipientEmail: visitor.email,
      recipientName: visitor.full_name,
      subjectOrSummary: "Check-in welcome SMS",
      relatedTable: "visitor_registrations",
      relatedId: visitor.id,
    });
    if (!result.success) {
      console.error("[check-in] SMS failed (visitor still checked in):", result.error);
      reportServerError(new Error(result.error ?? "Check-in SMS failed"), {
        route: "/api/admin/checkin",
        kind: "sms",
        extra: { op: "check_in_welcome", visitor_id: visitor.id, failOpen: true },
      });
      return;
    }
    console.log("[check-in] SMS accepted for pre-registered check-in.");
  } catch (err) {
    console.error("[check-in] SMS threw (visitor still checked in):", err);
    reportServerError(err, {
      route: "/api/admin/checkin",
      kind: "sms",
      extra: { op: "check_in_welcome_throw", visitor_id: visitor.id, failOpen: true },
    });
  }
}

/** Human-readable labels for activity_logs.action values. */
import { formatFormToggleActivitySummary, isFormToggleForm } from "@/lib/formToggles";

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  status_change: "Status change",
  news_published: "News published",
  news_unpublished: "News unpublished",
  login: "Login",
  export: "CSV export",
  admin_invited: "Admin invited",
  admin_deleted: "Admin deleted",
  communication_sent: "Communication sent",
  walk_in_registration_toggled: "Walk-in registration toggled",
  sponsor_form_toggled: "Sponsor form toggled",
  exhibitor_form_toggled: "Exhibitor form toggled",
  visit_form_toggled: "Visit form toggled",
  visitor_checked_in: "Visitor checked in",
  visitor_confirmation_resent: "Visitor confirmation resent",
  bulk_confirmation_resend: "Bulk confirmation resend",
};

export const ACTIVITY_ACTIONS = Object.keys(ACTIVITY_ACTION_LABELS);

const TABLE_LABELS: Record<string, string> = {
  exhibitor_applications: "Exhibitor applications",
  sponsor_inquiries: "Sponsor inquiries",
  visitor_registrations: "Visitor registrations",
  contact_messages: "Contact messages",
  news_posts: "News posts",
  admin_profiles: "Admin profiles",
  communication_log: "Communications",
  bulk_confirmation_resend_batch: "Bulk confirmation resend",
  app_settings: "App settings",
};

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatStatus(value: unknown): string {
  return str(value).replace(/_/g, " ");
}

/** Short one-line summary for the list table. */
export function formatActivitySummary(
  action: string,
  details: Record<string, unknown> | null,
): string {
  if (!details) return "-";

  switch (action) {
    case "status_change": {
      const oldStatus = formatStatus(details.old_status);
      const newStatus = formatStatus(details.new_status);
      if (oldStatus && newStatus) return `${oldStatus} → ${newStatus}`;
      break;
    }
    case "news_published":
      return details.title ? `Published "${details.title}"` : "Published";
    case "news_unpublished":
      return details.title ? `Unpublished "${details.title}"` : "Unpublished";
    case "admin_invited": {
      const email = str(details.invited_email);
      const role = str(details.role) || "admin";
      return email ? `Invited ${email} (${role.replace(/_/g, " ")})` : "Admin invited";
    }
    case "admin_deleted": {
      const email = str(details.deleted_email);
      const role = str(details.deleted_role) || "admin";
      return email ? `Deleted ${email} (${role.replace(/_/g, " ")})` : "Admin deleted";
    }
    case "export": {
      const count = details.row_count;
      const filters = details.filters as Record<string, unknown> | undefined;
      const status =
        filters && typeof filters.status === "string" && filters.status !== "all"
          ? `, status: ${formatStatus(filters.status)}`
          : "";
      return typeof count === "number" ? `Exported ${count} row${count === 1 ? "" : "s"}${status}` : "CSV export";
    }
    case "login":
      return "Signed in";
    case "communication_sent": {
      const count = details.recipient_count;
      const channel = str(details.channel);
      if (typeof count === "number" && channel) {
        return `Sent ${channel} to ${count} recipient${count === 1 ? "" : "s"}`;
      }
      break;
    }
    case "walk_in_registration_toggled":
      return details.enabled === true ? "Opened walk-in registration" : "Closed walk-in registration";
    case "sponsor_form_toggled":
    case "exhibitor_form_toggled":
    case "visit_form_toggled": {
      const form = isFormToggleForm(details.form) ? details.form : null;
      if (form) return formatFormToggleActivitySummary(form, details.enabled);
      break;
    }
    case "visitor_checked_in": {
      const who = str(details.name) || str(details.email);
      const method = str(details.method);
      if (who && method === "manual_lookup") return `Checked in ${who} (name/email lookup)`;
      if (who && method === "qr") return `Checked in ${who} (QR)`;
      if (who) return `Checked in ${who}`;
      break;
    }
    case "visitor_confirmation_resent": {
      const who = str(details.name) || str(details.email);
      if (who) {
        return details.email_sent === false
          ? `Resent confirmation to ${who} (email failed)`
          : `Resent confirmation to ${who}`;
      }
      break;
    }
    case "bulk_confirmation_resend": {
      const count = details.recipient_count;
      const mode = str(details.mode);
      if (typeof count === "number") {
        if (mode === "resume_quota") {
          return `Resumed bulk confirmation resend for ${count} quota-exceeded recipient${count === 1 ? "" : "s"}`;
        }
        return `Started bulk confirmation resend for ${count} confirmed visitor${count === 1 ? "" : "s"}`;
      }
      break;
    }
  }

  return "-";
}

export function formatActivityTarget(table: string | null, id: string | null): string {
  if (!table && !id) return "-";
  const label = table ? (TABLE_LABELS[table] ?? table.replace(/_/g, " ")) : "-";
  if (!id) return label;
  return `${label} · ${id.slice(0, 8)}…`;
}

export function formatActivityAction(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

/** Pretty-printed JSON for expandable detail panels. */
export function formatActivityDetailsJson(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return "-";
  return JSON.stringify(details, null, 2);
}

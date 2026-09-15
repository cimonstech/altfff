import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Handshake,
  Users,
  Mail,
  LayoutDashboard,
  Newspaper,
  Megaphone,
  ScrollText,
  Shield,
  ScanLine,
  ClipboardList,
} from "lucide-react";
import type { AdminCardAccent } from "@/components/admin/AdminCard";

/** Shared icons so Overview cards and sidebar nav stay visually aligned. */
export const ADMIN_SECTION_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/checkin-overview": ClipboardList,
  "/admin/exhibitors": BriefcaseBusiness,
  "/admin/sponsors": Handshake,
  "/admin/visitors": Users,
  "/admin/contact": Mail,
  "/admin/news": Newspaper,
  "/admin/communications": Megaphone,
  "/admin/checkin": ScanLine,
  "/admin/activity": ScrollText,
  "/admin/admins": Shield,
};

export const OVERVIEW_ACCENTS: Record<string, AdminCardAccent> = {
  exhibitor_applications: "gold",
  sponsor_inquiries: "forest",
  visitor_registrations: "madder",
  contact_messages: "indigo",
};

/** Icons for AdminDataTable empty / no-results states (aligned with sidebar). */
export const ADMIN_TABLE_LIST_ICONS: Record<string, LucideIcon> = {
  exhibitor_applications: BriefcaseBusiness,
  sponsor_inquiries: Handshake,
  visitor_registrations: Users,
  contact_messages: Mail,
};

export const ADMIN_LIST_EMPTY: Record<string, { title: string; description: string }> = {
  exhibitor_applications: {
    title: "No exhibitor applications yet",
    description: "Applications from the public exhibit form will appear here once submitted.",
  },
  sponsor_inquiries: {
    title: "No sponsor inquiries yet",
    description: "Sponsorship form submissions will appear here once received.",
  },
  visitor_registrations: {
    title: "No visitor registrations yet",
    description: "Visitor sign-ups from the registration form will appear here.",
  },
  contact_messages: {
    title: "No contact messages yet",
    description: "Messages from the public contact form will appear here.",
  },
};

/**
 * Status → pill tone for Overview breakdowns.
 * Attention (gold), in-progress (indigo), resolved (forest), closed (muted / madder).
 */
export function adminStatusPillClass(status: string): string {
  switch (status) {
    case "new":
    case "new_inquiry":
    case "registered":
      return "bg-gold/20 text-gold-deep";
    case "under_review":
    case "contacted":
    case "proposal_sent":
    case "read":
      return "bg-indigo/15 text-indigo";
    case "invoiced":
    case "payment_received":
    case "confirmed":
    case "responded":
      return "bg-forest/15 text-forest";
    case "cancelled":
    case "declined":
    case "archived":
      return "bg-madder/15 text-madder";
    default:
      return "bg-ink/10 text-ink/60";
  }
}

export function formatAdminStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function formatVisitorSourceLabel(source: unknown): string {
  return source === "walk_in" ? "Walk-in" : "Pre-registered";
}

export function visitorSourcePillClass(source: unknown): string {
  return source === "walk_in" ? "bg-forest/15 text-forest" : "bg-indigo/15 text-indigo";
}

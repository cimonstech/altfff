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
} from "lucide-react";
import type { AdminCardAccent } from "@/components/admin/AdminCard";

/** Shared icons so Overview cards and sidebar nav stay visually aligned. */
export const ADMIN_SECTION_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
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

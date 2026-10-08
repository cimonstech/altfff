"use client";

import AdminDataTable from "@/components/admin/AdminDataTable";
import WalkInRegistrationToggle from "@/components/admin/WalkInRegistrationToggle";
import BulkConfirmationResendPanel from "@/components/admin/BulkConfirmationResendPanel";
import {
  formatVisitorSourceLabel,
  visitorSourcePillClass,
} from "@/components/admin/adminVisual";
import { formatVisitorBusinessType } from "@/lib/visitorBusinessType";

const STATUSES = ["registered", "confirmed", "declined", "cancelled"];

function visitorSourceBadge(source: unknown) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${visitorSourcePillClass(source)}`}
    >
      {formatVisitorSourceLabel(source)}
    </span>
  );
}

export default function AdminVisitorsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Visitor Registrations
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        Pre-registered visitors start as <span className="font-medium">registered</span> (pending review) — use
        Approve or Decline in the detail view. Walk-in registrations from{" "}
        <span className="font-medium">/walk-in</span> are confirmed immediately with no QR code. Use the toggle
        below to open or close on-site walk-in registration on event day.
      </p>
      <div className="mt-6 space-y-6">
        <WalkInRegistrationToggle />
        <BulkConfirmationResendPanel />
        <AdminDataTable
          table="visitor_registrations"
          entityLabel="Visitor Registration"
          statuses={STATUSES}
          visitorVetting
          enableCheckInFilter
          searchFields={["full_name", "email", "company_name"]}
          titleField="full_name"
          rowHeaderExtra={(row) => visitorSourceBadge(row.source)}
          columns={[
            { label: "Name", field: "full_name" },
            { label: "Email", field: "email" },
            { label: "Type", field: "source", format: (row) => visitorSourceBadge(row.source) },
            { label: "Country", field: "country" },
            { label: "Status", field: "status" },
            { label: "Created", field: "created_at", format: (row) => new Date(String(row.created_at)).toLocaleDateString() },
          ]}
          detailFields={[
            { label: "Registration type", field: "source", format: (row) => visitorSourceBadge(row.source) },
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Company", field: "company_name" },
            { label: "Social / website", field: "social_media_website" },
            { label: "Country", field: "country" },
            { label: "Interest", field: "interest" },
            {
              label: "B2B/B2C",
              field: "business_type",
              format: (row) => formatVisitorBusinessType(row.business_type),
            },
            { label: "Heard about us", field: "heard_about_us" },
          ]}
        />
      </div>
    </div>
  );
}

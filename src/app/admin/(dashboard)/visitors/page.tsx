"use client";

import AdminDataTable from "@/components/admin/AdminDataTable";

const STATUSES = ["registered", "confirmed", "declined", "cancelled"];

export default function AdminVisitorsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Visitor Registrations
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        New registrations start as <span className="font-medium">registered</span> (pending review). Use Approve or
        Decline in the detail view - do not set confirmed/declined from the status dropdown.
      </p>
      <div className="mt-6">
        <AdminDataTable
          table="visitor_registrations"
          entityLabel="Visitor Registration"
          statuses={STATUSES}
          visitorVetting
          searchFields={["full_name", "email", "company_name"]}
          titleField="full_name"
          columns={[
            { label: "Name", field: "full_name" },
            { label: "Email", field: "email" },
            { label: "Attending", field: "number_attending" },
            { label: "Status", field: "status" },
            { label: "Created", field: "created_at", format: (row) => new Date(String(row.created_at)).toLocaleDateString() },
          ]}
          detailFields={[
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Number Attending", field: "number_attending" },
            { label: "Heard About Us Via", field: "heard_about_us" },
            // From migration 0002 - only ever populated by the fuller
            // inline /visit form, not the quick modal. Shown empty ("-")
            // rather than hidden when a row came from the modal instead.
            { label: "Company", field: "company_name" },
            { label: "Job Title", field: "job_title" },
            { label: "Country", field: "country" },
            { label: "Interest", field: "interest" },
          ]}
        />
      </div>
    </div>
  );
}

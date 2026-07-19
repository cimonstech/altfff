"use client";

import AdminDataTable from "@/components/admin/AdminDataTable";

const STATUSES = ["new_inquiry", "contacted", "proposal_sent", "confirmed", "declined"];

export default function AdminSponsorsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Sponsor Inquiries
      </h1>
      <div className="mt-6">
        <AdminDataTable
          table="sponsor_inquiries"
          entityLabel="Sponsor Inquiry"
          statuses={STATUSES}
          searchFields={["full_name", "email", "company_name"]}
          titleField="full_name"
          columns={[
            { label: "Name", field: "full_name" },
            { label: "Company", field: "company_name" },
            { label: "Email", field: "email" },
            { label: "Status", field: "status" },
            { label: "Created", field: "created_at", format: (row) => new Date(String(row.created_at)).toLocaleDateString() },
          ]}
          detailFields={[
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Company", field: "company_name" },
            { label: "Job Title", field: "job_title" },
            { label: "Nature of Business", field: "nature_of_business" },
            { label: "LinkedIn Handle", field: "linkedin_handle" },
            { label: "Heard About Us Via", field: "heard_about_us" },
            {
              label: "Newsletter Opt-In",
              field: "newsletter_opt_in",
              format: (row) => (row.newsletter_opt_in ? "Yes" : "No"),
            },
          ]}
        />
      </div>
    </div>
  );
}

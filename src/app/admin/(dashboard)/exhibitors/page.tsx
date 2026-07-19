"use client";

import AdminDataTable from "@/components/admin/AdminDataTable";

const STATUSES = ["new", "under_review", "invoiced", "payment_received", "confirmed", "cancelled"];

export default function AdminExhibitorsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Exhibitor Applications
      </h1>
      <div className="mt-6">
        <AdminDataTable
          table="exhibitor_applications"
          entityLabel="Exhibitor Application"
          statuses={STATUSES}
          searchFields={["full_name", "email", "company_name"]}
          titleField="full_name"
          columns={[
            { label: "Name", field: "full_name" },
            { label: "Company", field: "company_name" },
            { label: "Email", field: "email" },
            { label: "Package", field: "package_type" },
            { label: "Status", field: "status" },
            { label: "Created", field: "created_at", format: (row) => new Date(String(row.created_at)).toLocaleDateString() },
          ]}
          detailFields={[
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Company", field: "company_name" },
            { label: "Job Title", field: "job_title" },
            { label: "Nature of Business", field: "nature_of_business" },
            { label: "Business Location", field: "business_location" },
            { label: "Country", field: "country" },
            { label: "Package", field: "package_type" },
            { label: "Heard About Us Via", field: "heard_about_us" },
          ]}
        />
      </div>
    </div>
  );
}

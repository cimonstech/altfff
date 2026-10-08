"use client";

import AdminDataTable from "@/components/admin/AdminDataTable";

const STATUSES = ["new", "read", "responded", "archived"];

function fullName(row: Record<string, unknown>) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || "-";
}

function truncate(value: unknown, length: number) {
  const str = value ? String(value) : "";
  return str.length > length ? `${str.slice(0, length)}…` : str || "-";
}

export default function AdminContactMessagesPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">
        Contact Messages
      </h1>
      <div className="mt-6">
        <AdminDataTable
          table="contact_messages"
          entityLabel="Contact Message"
          statuses={STATUSES}
          searchFields={["first_name", "last_name", "email"]}
          titleField="email"
          getTitle={fullName}
          columns={[
            { label: "Name", field: "name", format: fullName },
            { label: "Email", field: "email" },
            { label: "Message", field: "message", format: (row) => truncate(row.message, 60) },
            { label: "Status", field: "status" },
            { label: "Created", field: "created_at", format: (row) => new Date(String(row.created_at)).toLocaleDateString() },
          ]}
          detailFields={[
            { label: "Email", field: "email" },
            { label: "Phone", field: "phone" },
            { label: "Message", field: "message" },
          ]}
        />
      </div>
    </div>
  );
}

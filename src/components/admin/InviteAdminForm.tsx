"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminCard from "@/components/admin/AdminCard";

export default function InviteAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: fullName, role }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || "Something went wrong sending the invite.");
        return;
      }
      setSuccess(true);
      setEmail("");
      setFullName("");
      setRole("admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCard className="mt-6" padding="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            />
          </div>
          <div>
            <label htmlFor="invite-name" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Full Name
            </label>
            <input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label htmlFor="invite-role" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}
            className="mt-1 min-h-11 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
          >
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-madder" role="alert">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-forest">Invite sent.</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60 sm:w-fit"
        >
          {submitting ? "Sending…" : "Send Invite"}
        </button>
      </form>
    </AdminCard>
  );
}

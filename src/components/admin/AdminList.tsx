"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";

export type AdminRow = {
  id: string;
  full_name: string | null;
  role: string;
  invited_at: string | null;
  email: string | null;
};

export default function AdminList({
  admins,
  currentUserId,
}: {
  admins: AdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const closeModal = () => {
    setDeleteTarget(null);
    setConfirmEmail("");
    setError("");
  };

  const handleDelete = async () => {
    if (!deleteTarget?.email) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || "Something went wrong deleting this admin.");
        return;
      }

      setSuccess(`${deleteTarget.email} has been removed.`);
      closeModal();
      router.refresh();
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  const emailMatches =
    deleteTarget?.email !== null &&
    deleteTarget?.email !== undefined &&
    confirmEmail.trim() === deleteTarget.email;

  return (
    <>
      {success && (
        <p className="mb-4 text-sm text-forest" role="status">
          {success}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface">
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Name
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Email
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Role
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Invited
              </th>
              <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-hairline">
                <td className="p-3 text-ink">{admin.full_name || "—"}</td>
                <td className="p-3 text-ink">{admin.email || "—"}</td>
                <td className="p-3 text-ink">{admin.role}</td>
                <td className="p-3 text-ink">
                  {admin.invited_at ? new Date(admin.invited_at).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-ink">
                  {admin.id === currentUserId ? (
                    <span className="text-xs text-ink/50">You</span>
                  ) : admin.email ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess("");
                        setDeleteTarget(admin);
                        setConfirmEmail("");
                        setError("");
                      }}
                      className="text-sm font-medium text-madder hover:underline"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-xs text-ink/50" title="No email on file">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-ink/60">
                  No admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={closeModal}
        titleId="delete-admin-heading"
        panelClassName="max-w-md"
      >
        {deleteTarget && (
          <div className="p-6 pt-12">
            <h2
              id="delete-admin-heading"
              className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
            >
              Delete Admin
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-indigo">
              This permanently removes{" "}
              <strong className="font-semibold text-ink">
                {deleteTarget.full_name || deleteTarget.email || "this admin"}
              </strong>
              &apos;s access and cannot be undone. Their account will be deleted from Supabase Auth.
            </p>

            <div className="mt-6">
              <label htmlFor="confirm-delete-email" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
                Type <span className="normal-case">{deleteTarget.email}</span> to confirm
              </label>
              <input
                id="confirm-delete-email"
                type="email"
                autoComplete="off"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={deleteTarget.email ?? ""}
                className="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
              />
            </div>

            {error && (
              <p className="mt-4 text-sm text-madder" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || !emailMatches}
                className="inline-flex items-center justify-center rounded-full bg-madder px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

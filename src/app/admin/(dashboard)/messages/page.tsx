import MessageLogView from "@/components/admin/MessageLogView";

export default function AdminMessagesPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Message Log</h1>
      <p className="mt-3 max-w-[65ch] text-sm text-indigo">
        Every email and SMS the system sends — transactional confirmations, vetting messages, walk-in comms, bulk
        communications, and check-in SMS. Use &ldquo;Never received anything&rdquo; to find registrations with zero
        logged messages to their email.
      </p>
      <MessageLogView />
    </div>
  );
}

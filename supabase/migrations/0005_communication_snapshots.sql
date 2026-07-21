-- Alt.FFF — Migration 0005: denormalized snapshots for communication history
-- Reason: communication_log.sent_by is a FK to admin_profiles that goes null
-- if that admin is ever deleted, permanently losing who actually sent it.
-- communication_recipients has no name at all, only email/phone, even though
-- the send logic already has the real name available for personalization.
-- Both get permanent snapshots captured at send time, same pattern already
-- used correctly for entity_notes.author_name and activity_logs.actor_email.

alter table public.communication_log
  add column if not exists sent_by_email text;

alter table public.communication_recipients
  add column if not exists recipient_name text;

comment on column public.communication_log.sent_by_email is 'Snapshot of the sending admin''s email at send time. Survives that admin account later being deleted. Null sent_by_email with null sent_by means a genuinely system-triggered send (no such path exists yet, but the schema supports it).';
comment on column public.communication_recipients.recipient_name is 'Snapshot of the recipient''s real name if known at send time (audience/table-based or pre-loaded selections). Null for freeform Custom-typed email/phone entries, which genuinely have no name attached.';

-- Backfill existing rows from the current sent_by FK, while those admin
-- accounts still exist, so existing history isn't left blank.
update public.communication_log cl
set sent_by_email = au.email
from public.admin_profiles ap
join auth.users au on au.id = ap.id
where cl.sent_by = ap.id
and cl.sent_by_email is null;

-- No RLS/GRANT changes needed, same reasoning as prior additive migrations.

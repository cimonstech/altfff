-- Alt.FFF - Migration 0003: entity_notes (append-only, multiple notes per record)
-- Save as supabase/migrations/0003_entity_notes.sql
-- Apply to BOTH Supabase projects.
--
-- Reason: the single admin_notes text column on each entity table only ever
-- holds one overwritable note, admins couldn't build a running history.
-- This adds a proper notes table: one row per note, attributed to whichever
-- admin wrote it, timestamped, and immutable once created (no update/delete
-- policy given, matching the spirit of an audit trail, if a note was wrong,
-- add a correcting note rather than editing history).
--
-- The old admin_notes column on each table is left in place, unused going
-- forward, but not dropped, harmless to keep, avoids an unnecessary
-- destructive migration for a column that may still hold early test data.

create table if not exists public.entity_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity_table text not null check (
    entity_table in ('exhibitor_applications', 'sponsor_inquiries', 'visitor_registrations', 'contact_messages')
  ),
  entity_id uuid not null,
  author_id uuid references public.admin_profiles(id) on delete set null,
  author_name text, -- denormalized snapshot, stays readable even if the admin account is later removed
  note text not null
);

comment on table public.entity_notes is 'Append-only note thread per record. One row per note, not a single overwritable field.';

create index if not exists entity_notes_lookup_idx on public.entity_notes (entity_table, entity_id, created_at desc);

alter table public.entity_notes enable row level security;

create policy "admins can view entity notes" on public.entity_notes
  for select using (public.is_admin());
create policy "admins can insert own entity notes" on public.entity_notes
  for insert with check (public.is_admin() and author_id = auth.uid());

-- No update/delete policy is intentional: notes are immutable once written.

grant select, insert on public.entity_notes to authenticated;
grant select, insert, update, delete on public.entity_notes to service_role;

-- =========================================================
-- End of migration 0003
-- =========================================================
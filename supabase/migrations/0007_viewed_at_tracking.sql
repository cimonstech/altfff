-- Alt.FFF - Migration 0007: viewed_at tracking for unread/bold row styling
-- Purely a UI-state marker (has this row been opened), fully independent
-- from the real business `status` column and from badge counts, which
-- must continue to reflect only genuine status transitions. Contact
-- doesn't need this column, its existing status already distinguishes
-- new/read correctly, this is only for the three entities where opening
-- a row deliberately does NOT change status.

alter table public.exhibitor_applications
  add column if not exists viewed_at timestamptz;

alter table public.sponsor_inquiries
  add column if not exists viewed_at timestamptz;

alter table public.visitor_registrations
  add column if not exists viewed_at timestamptz;

comment on column public.exhibitor_applications.viewed_at is 'When this row was first opened in the admin dashboard. UI-only (bold/unread styling), does not affect status or badge counts.';
comment on column public.sponsor_inquiries.viewed_at is 'When this row was first opened in the admin dashboard. UI-only (bold/unread styling), does not affect status or badge counts.';
comment on column public.visitor_registrations.viewed_at is 'When this row was first opened in the admin dashboard. UI-only (bold/unread styling), does not affect status or badge counts.';

-- No RLS/GRANT changes needed, same reasoning as prior additive migrations.

-- Alt.FFF - Migration 0012: distinguish walk-in registrations from pre-registered visitors

alter table public.visitor_registrations
  add column if not exists source text not null default 'pre_registered';

alter table public.visitor_registrations
  drop constraint if exists visitor_registrations_source_check;

alter table public.visitor_registrations
  add constraint visitor_registrations_source_check
  check (source in ('pre_registered', 'walk_in'));

comment on column public.visitor_registrations.source is 'pre_registered: submitted in advance, goes through manual vetting and QR issuance. walk_in: submitted on-site at the event, auto-confirmed, no QR, no vetting queue.';

-- No RLS/GRANT changes needed, same reasoning as prior additive migrations.

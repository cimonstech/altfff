-- Alt.FFF — Migration 0009: visitor vetting, QR issuance, check-in tracking

alter table public.visitor_registrations
  drop constraint if exists visitor_registrations_status_check;

alter table public.visitor_registrations
  add constraint visitor_registrations_status_check
  check (status in ('registered', 'confirmed', 'declined', 'cancelled'));
-- 'registered' now means pending review, 'confirmed' means approved (QR issued),
-- 'declined' is a new explicit admin rejection, distinct from 'cancelled' (visitor-initiated).

alter table public.visitor_registrations
  add column if not exists qr_token text unique,
  add column if not exists qr_issued_at timestamptz,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references public.admin_profiles(id) on delete set null,
  add column if not exists checked_in_by_email text;

comment on column public.visitor_registrations.qr_token is 'Unguessable token encoded in the visitor''s QR code. Identifies them only, does NOT itself perform check-in, that requires an authenticated admin API call.';
comment on column public.visitor_registrations.checked_in_by_email is 'Denormalized snapshot of which admin performed check-in, survives that admin account later being deleted.';

create index if not exists visitor_registrations_qr_token_idx on public.visitor_registrations (qr_token);

-- No RLS/GRANT changes needed beyond what already exists (admin SELECT/UPDATE already covers these new columns).

-- Alt.FFF - Migration 0011: full_name can never be null, enforced at the database level
-- Application-level validation already requires this; this constraint makes it
-- structurally impossible regardless of which code path performs the insert,
-- not dependent on every future script/route remembering to validate.
-- Requires zero existing null full_name rows in either table, resolve those first.

alter table public.exhibitor_applications
  alter column full_name set not null;

alter table public.visitor_registrations
  alter column full_name set not null;

comment on column public.exhibitor_applications.full_name is 'Required. Enforced NOT NULL at the database level, not just application validation.';
comment on column public.visitor_registrations.full_name is 'Required. Enforced NOT NULL at the database level, not just application validation.';

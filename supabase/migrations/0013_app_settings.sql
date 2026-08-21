-- Alt.FFF - Migration 0013: general-purpose app settings table
-- Starting with the walk-in registration toggle, built generically so future
-- on/off style admin controls can reuse this same table rather than each
-- needing their own bespoke column or migration.

create table if not exists public.app_settings (
  key text primary key,
  value boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles(id) on delete set null,
  updated_by_email text
);

alter table public.app_settings enable row level security;

create policy "Admins can read app settings"
  on public.app_settings for select
  using (public.is_admin());

create policy "Admins can update app settings"
  on public.app_settings for update
  using (public.is_admin());

-- Anon needs to READ this specific setting (to know whether to show the walk-in form),
-- but never write to it. A narrow, explicit grant, not blanket anon access to this table.
grant select on public.app_settings to anon;

insert into public.app_settings (key, value) values ('walk_in_registration_enabled', false)
on conflict (key) do nothing;

comment on table public.app_settings is 'Simple key/value admin-controlled settings. anon has read-only access for public-facing feature gates; writes are admin-only.';

-- RLS still applies after GRANT — anon/authenticated roles need explicit policies too.
create policy "anon can read app settings"
  on public.app_settings for select
  to anon
  using (true);

grant select, update on public.app_settings to authenticated;

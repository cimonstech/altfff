-- Alt.FFF - Migration 0015: independent, single-admin-restricted toggles per form

insert into public.app_settings (key, value) values
  ('sponsor_form_enabled', true),
  ('exhibitor_form_enabled', true),
  ('visit_form_enabled', true)
on conflict (key) do nothing;

-- Remove superseded single-toggle key if an earlier draft of 0015 was applied.
delete from public.app_settings where key = 'public_forms_enabled';

-- Restrict writes to these three keys to one named admin account only, not is_admin() generally.
-- This is a deliberate, narrow exception, not a general permissions pattern, comment clearly for future maintainers.
drop policy if exists "Admins can update app settings" on public.app_settings;
drop policy if exists "Admins can update most app settings" on public.app_settings;
drop policy if exists "Only cimonstechnologies can update the public forms toggle" on public.app_settings;
drop policy if exists "Only cimonstechnologies can update the per-form toggles" on public.app_settings;

create policy "Admins can update most app settings"
  on public.app_settings for update
  using (
    key not in ('sponsor_form_enabled', 'exhibitor_form_enabled', 'visit_form_enabled')
    and is_admin()
  );

-- Live auth.users email lookup runs inside a security definer function so the
-- authenticated role never needs direct SELECT on auth.users (Postgres error 42501).
create or replace function public.is_form_toggle_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
    and auth.users.email = 'cimonstechnologies@gmail.com'
  );
$$;

create policy "Only cimonstechnologies can update the per-form toggles"
  on public.app_settings for update
  using (
    key in ('sponsor_form_enabled', 'exhibitor_form_enabled', 'visit_form_enabled')
    and public.is_form_toggle_admin()
  );

comment on column public.app_settings.value is 'For sponsor_form_enabled / exhibitor_form_enabled / visit_form_enabled specifically: write access restricted to cimonstechnologies@gmail.com only, not general admin access, enforced both here and at the API layer. Email is checked via a live lookup against auth.users using auth.uid(), not the email embedded in the JWT, since a token''s email claim can go stale if the account''s email is ever changed before a fresh token is issued.';

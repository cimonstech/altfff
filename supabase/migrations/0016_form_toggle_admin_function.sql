-- Alt.FFF - Migration 0016: fix form-toggle RLS auth.users permission (42501)
--
-- Migration 0015 inlined auth.users in the RLS policy, but the authenticated
-- role cannot SELECT auth.users directly. Wrap the live email lookup in a
-- security definer function (same pattern as is_admin()).

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

drop policy if exists "Only cimonstechnologies can update the per-form toggles" on public.app_settings;

create policy "Only cimonstechnologies can update the per-form toggles"
  on public.app_settings for update
  using (
    key in ('sponsor_form_enabled', 'exhibitor_form_enabled', 'visit_form_enabled')
    and public.is_form_toggle_admin()
  );

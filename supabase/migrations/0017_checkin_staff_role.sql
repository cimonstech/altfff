-- Alt.FFF - Migration 0017: Check-in Staff role, narrow and function-scoped

alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in ('admin', 'super_admin', 'checkin_staff'));

-- is_admin() previously meant "any admin_profiles row". That would give
-- event-day check-in staff the same RLS write surface as a real admin
-- (visitor updates, exhibitors, news, communications, settings, …).
-- Narrow it to the two trusted roles. checkin_staff is authenticated staff
-- with its own, much smaller policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

-- Own-row read so checkin_staff can load their role for routing/nav.
-- (The existing "view all profiles" policy uses is_admin(), which they
-- no longer satisfy.)
drop policy if exists "staff can read own admin profile" on public.admin_profiles;
create policy "staff can read own admin profile"
  on public.admin_profiles for select
  using (id = auth.uid());

-- Own-profile updates are for real admins only. Without this, checkin_staff
-- could UPDATE their own row (the old policy was only `id = auth.uid()`)
-- and would be one request away from self-promoting to super_admin.
drop policy if exists "admins can update own profile" on public.admin_profiles;
create policy "admins can update own profile"
  on public.admin_profiles for update
  using (id = auth.uid() and public.is_admin())
  with check (id = auth.uid() and public.is_admin());

-- Read access: this role can look up visitors to check them in, nothing else.
drop policy if exists "Checkin staff can read visitor registrations" on public.visitor_registrations;
create policy "Checkin staff can read visitor registrations"
  on public.visitor_registrations for select
  using (
    exists (
      select 1 from public.admin_profiles
      where admin_profiles.id = auth.uid()
      and admin_profiles.role in ('admin', 'super_admin', 'checkin_staff')
    )
  );

-- Login + check-in audit only. No SELECT on the log (still super_admin),
-- and no other action types.
drop policy if exists "checkin staff can insert own activity log" on public.activity_logs;
create policy "checkin staff can insert own activity log"
  on public.activity_logs for insert
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.admin_profiles
      where admin_profiles.id = auth.uid()
        and admin_profiles.role = 'checkin_staff'
    )
    and action in ('login', 'visitor_checked_in')
  );

-- Deliberately NO UPDATE policy for checkin_staff on visitor_registrations.
-- The only way this role can modify a row at all is through the function below,
-- which touches only check-in fields, with the same single-use guard as the QR path.
-- This means even a mistake in a future RLS policy can't accidentally grant this
-- role broader write access, because there is no broader access to grant.

create or replace function public.perform_visitor_checkin(registration_id uuid)
returns table (success boolean, message text, visitor_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_checked_in_at timestamptz;
  v_name text;
begin
  if not exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin', 'checkin_staff')
  ) then
    return query select false, 'Forbidden.', null::text;
    return;
  end if;

  select status, checked_in_at, full_name into v_status, v_checked_in_at, v_name
  from public.visitor_registrations
  where id = registration_id;

  if v_status is null then
    return query select false, 'Registration not found.', null::text;
    return;
  end if;

  if v_status != 'confirmed' then
    return query select false, 'This registration was never approved, cannot check in.', v_name;
    return;
  end if;

  if v_checked_in_at is not null then
    return query select false, 'Already checked in at ' || v_checked_in_at::text || '.', v_name;
    return;
  end if;

  update public.visitor_registrations
  set checked_in_at = now(),
      checked_in_by = auth.uid(),
      checked_in_by_email = (select email from auth.users where id = auth.uid())
  where id = registration_id
    and status = 'confirmed'
    and checked_in_at is null;

  if not found then
    select checked_in_at into v_checked_in_at
    from public.visitor_registrations
    where id = registration_id;
    if v_checked_in_at is not null then
      return query select false, 'Already checked in at ' || v_checked_in_at::text || '.', v_name;
    else
      return query select false, 'This registration was never approved, cannot check in.', v_name;
    end if;
    return;
  end if;

  return query select true, 'Checked in successfully.', v_name;
end;
$$;

revoke all on function public.perform_visitor_checkin(uuid) from public;
grant execute on function public.perform_visitor_checkin(uuid) to authenticated;

comment on function public.perform_visitor_checkin is 'The only way checkin_staff can modify a visitor row. Security definer, touches only check-in fields, same single-use guard as the QR scan path. Callable by any authenticated admin role, but checkin_staff has no other write access to this table at all.';

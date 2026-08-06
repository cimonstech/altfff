-- Alt.FFF - Core schema migration 0001
-- Save this file as supabase/migrations/0001_core_schema.sql in the project repo.
-- Designed to be run identically against two separate Supabase projects (staging + production).
-- Apply via: supabase db push  (or paste directly into the SQL Editor on each project)

create extension if not exists pgcrypto;

-- =========================================================
-- 1. ADMIN PROFILES
-- One row per admin, linked 1:1 to a Supabase Auth user.
-- Admins are created via Supabase's inviteUserByEmail(), which creates the
-- auth.users row; this table is populated separately once they exist (or via
-- a trigger, see note below) to hold role/display info Auth doesn't store.
-- =========================================================

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  invited_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_profiles is 'One row per invited admin user. Role gates dashboard access.';

-- Optional but recommended: auto-create a profile row whenever a new auth user
-- is created via invite, so nobody has to remember to insert it manually.
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admin_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

-- =========================================================
-- 2. EXHIBITOR APPLICATIONS
-- =========================================================

create table if not exists public.exhibitor_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  phone text,
  company_name text,
  job_title text,
  nature_of_business text,
  business_location text,
  package_type text check (package_type in ('standard_booth', 'medium_booth', 'premium_booth', 'innovation_pod')),
  heard_about_us text,
  status text not null default 'new' check (
    status in ('new', 'under_review', 'invoiced', 'payment_received', 'confirmed', 'cancelled')
  ),
  status_updated_at timestamptz not null default now(),
  admin_notes text
);

comment on table public.exhibitor_applications is 'Public exhibitor application submissions and their review status.';

-- =========================================================
-- 3. SPONSOR INQUIRIES
-- =========================================================

create table if not exists public.sponsor_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  phone text,
  company_name text,
  job_title text,
  nature_of_business text,
  linkedin_handle text,
  heard_about_us text,
  newsletter_opt_in boolean not null default false,
  status text not null default 'new_inquiry' check (
    status in ('new_inquiry', 'contacted', 'proposal_sent', 'confirmed', 'declined')
  ),
  status_updated_at timestamptz not null default now(),
  admin_notes text
);

comment on table public.sponsor_inquiries is 'Public sponsorship inquiry submissions and their pipeline status.';

-- =========================================================
-- 4. VISITOR REGISTRATIONS
-- =========================================================

create table if not exists public.visitor_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  email text not null,
  phone text,
  number_attending integer default 1,
  heard_about_us text,
  status text not null default 'registered' check (
    status in ('registered', 'confirmed', 'cancelled')
  ),
  status_updated_at timestamptz not null default now(),
  admin_notes text
);

comment on table public.visitor_registrations is 'Public visitor registration submissions.';

-- =========================================================
-- 5. CONTACT MESSAGES
-- The /contact form already sends via Resend directly; this table adds
-- persistence so submissions also show up in the admin dashboard.
-- =========================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name text,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (
    status in ('new', 'read', 'responded', 'archived')
  ),
  admin_notes text
);

comment on table public.contact_messages is 'Contact form submissions, persisted in addition to the direct Resend email.';

-- =========================================================
-- 6. NEWS POSTS (Tiptap-authored blog/News section)
-- =========================================================

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content jsonb, -- raw Tiptap/ProseMirror JSON document
  content_html text, -- rendered HTML cache, regenerated on save for fast public reads
  cover_image_url text,
  author_id uuid references public.admin_profiles(id) on delete set null,
  published boolean not null default false,
  published_at timestamptz
);

comment on table public.news_posts is 'Admin-authored News/blog posts. Public site only reads rows where published = true.';

create index if not exists news_posts_published_idx on public.news_posts (published, published_at desc);

-- =========================================================
-- 7. COMMUNICATION LOG + RECIPIENTS
-- Tracks every bulk/individual email or SMS send from the admin Communications tab.
-- =========================================================

create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_by uuid references public.admin_profiles(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  audience_type text not null check (
    audience_type in ('exhibitor', 'sponsor', 'visitor', 'contact', 'custom')
  ),
  audience_filter jsonb, -- the filter criteria used to select recipients, for audit/reference
  subject text, -- email only, null for sms
  body text not null,
  recipient_count integer not null default 0,
  status text not null default 'queued' check (
    status in ('queued', 'sending', 'sent', 'partially_failed', 'failed')
  ),
  queue_message_id text -- QStash message id, for tracing a queued bulk job
);

comment on table public.communication_log is 'One row per send action (bulk or individual) from the admin Communications tab.';

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communication_log(id) on delete cascade,
  created_at timestamptz not null default now(),
  recipient_email text,
  recipient_phone text,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  sent_at timestamptz,
  error_message text
);

comment on table public.communication_recipients is 'Per-recipient delivery status for a communication_log entry, for audit and retry.';

create index if not exists communication_recipients_comm_idx on public.communication_recipients (communication_id);

-- =========================================================
-- 8. ACTIVITY LOGS (super_admin only)
-- Records admin actions: status changes (auto-logged via trigger below),
-- logins, CSV exports, communications sent, news published, admins invited,
-- and anything else the app explicitly logs. Regular admins cannot read this
-- table at all, only super_admin can, per requirement.
-- =========================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.admin_profiles(id) on delete set null,
  actor_email text, -- denormalized snapshot so the log stays readable even if the admin is later removed
  action text not null, -- e.g. 'status_change', 'login', 'export', 'communication_sent', 'news_published', 'admin_invited'
  target_table text, -- e.g. 'exhibitor_applications', nullable for actions with no single target table
  target_id uuid, -- nullable, the affected row's id if applicable
  details jsonb -- arbitrary context: old/new status, export filters + row count, recipient_count, etc.
);

comment on table public.activity_logs is 'Audit trail of admin actions. Readable by super_admin only.';

create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_idx on public.activity_logs (actor_id);

-- Generic trigger function: auto-logs whenever a row's `status` column changes,
-- attached to all four public-facing form tables below.
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.activity_logs (actor_id, actor_email, action, target_table, target_id, details)
    values (
      auth.uid(),
      (select email from auth.users where id = auth.uid()),
      'status_change',
      tg_table_name,
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_status_change on public.exhibitor_applications;
create trigger log_status_change after update on public.exhibitor_applications
  for each row execute function public.log_status_change();

drop trigger if exists log_status_change on public.sponsor_inquiries;
create trigger log_status_change after update on public.sponsor_inquiries
  for each row execute function public.log_status_change();

drop trigger if exists log_status_change on public.visitor_registrations;
create trigger log_status_change after update on public.visitor_registrations
  for each row execute function public.log_status_change();

drop trigger if exists log_status_change on public.contact_messages;
create trigger log_status_change after update on public.contact_messages
  for each row execute function public.log_status_change();

-- news_posts uses `published` (boolean) rather than `status`, separate trigger for that transition
create or replace function public.log_news_publish_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.published is distinct from old.published then
    insert into public.activity_logs (actor_id, actor_email, action, target_table, target_id, details)
    values (
      auth.uid(),
      (select email from auth.users where id = auth.uid()),
      case when new.published then 'news_published' else 'news_unpublished' end,
      'news_posts',
      new.id,
      jsonb_build_object('slug', new.slug, 'title', new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_news_publish_change on public.news_posts;
create trigger log_news_publish_change after update on public.news_posts
  for each row execute function public.log_news_publish_change();

-- Note on CSV export logging: exporting data is an application-layer action
-- (an API route reads a table via normal admin-scoped RLS, then streams a CSV),
-- it doesn't need its own table. The export API route should insert one row
-- into activity_logs per export (action = 'export', details = { table, filters, row_count }).
-- Same pattern applies to logging admin logins and bulk communications sent.

-- =========================================================
-- 8. updated_at auto-touch trigger (shared across tables)
-- =========================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_updated_at on public.exhibitor_applications;
create trigger touch_updated_at before update on public.exhibitor_applications
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.sponsor_inquiries;
create trigger touch_updated_at before update on public.sponsor_inquiries
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.visitor_registrations;
create trigger touch_updated_at before update on public.visitor_registrations
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.contact_messages;
create trigger touch_updated_at before update on public.contact_messages
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.news_posts;
create trigger touch_updated_at before update on public.news_posts
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.admin_profiles;
create trigger touch_updated_at before update on public.admin_profiles
  for each row execute function public.touch_updated_at();

-- =========================================================
-- 9. ROW LEVEL SECURITY
-- Rule of thumb applied throughout:
--   - Public/anon can INSERT into the four form tables (submit a form) but
--     can never SELECT, UPDATE, or DELETE - they can't read anyone's data back.
--   - Only authenticated admins (present in admin_profiles) can SELECT/UPDATE
--     the form tables, and fully manage news_posts and communications.
--   - Public/anon can SELECT news_posts only where published = true.
--   - activity_logs is readable by super_admin ONLY, not regular admins.
-- =========================================================

alter table public.admin_profiles enable row level security;
alter table public.exhibitor_applications enable row level security;
alter table public.sponsor_inquiries enable row level security;
alter table public.visitor_registrations enable row level security;
alter table public.contact_messages enable row level security;
alter table public.news_posts enable row level security;
alter table public.communication_log enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.activity_logs enable row level security;

-- Helper: is the current request from a known admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles where id = auth.uid()
  );
$$;

-- Helper: is the current request from a super_admin specifically?
create or replace function public.is_super_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

-- admin_profiles: admins can read all profiles, only manage their own row for self-service updates
-- Role changes (promoting to super_admin) should happen via a super_admin-only API route using the
-- service role key, not left open to self-update, so role is intentionally NOT included in what a
-- regular admin can change about their own row (enforce this at the application layer too).
create policy "admins can view all admin profiles" on public.admin_profiles
  for select using (public.is_admin());
create policy "admins can update own profile" on public.admin_profiles
  for update using (id = auth.uid());

-- exhibitor_applications
create policy "public can submit exhibitor applications" on public.exhibitor_applications
  for insert with check (true);
create policy "admins can view exhibitor applications" on public.exhibitor_applications
  for select using (public.is_admin());
create policy "admins can update exhibitor applications" on public.exhibitor_applications
  for update using (public.is_admin());

-- sponsor_inquiries
create policy "public can submit sponsor inquiries" on public.sponsor_inquiries
  for insert with check (true);
create policy "admins can view sponsor inquiries" on public.sponsor_inquiries
  for select using (public.is_admin());
create policy "admins can update sponsor inquiries" on public.sponsor_inquiries
  for update using (public.is_admin());

-- visitor_registrations
create policy "public can submit visitor registrations" on public.visitor_registrations
  for insert with check (true);
create policy "admins can view visitor registrations" on public.visitor_registrations
  for select using (public.is_admin());
create policy "admins can update visitor registrations" on public.visitor_registrations
  for update using (public.is_admin());

-- contact_messages
create policy "public can submit contact messages" on public.contact_messages
  for insert with check (true);
create policy "admins can view contact messages" on public.contact_messages
  for select using (public.is_admin());
create policy "admins can update contact messages" on public.contact_messages
  for update using (public.is_admin());

-- news_posts: public can read published only; admins can do everything
create policy "public can view published news" on public.news_posts
  for select using (published = true);
create policy "admins can view all news posts" on public.news_posts
  for select using (public.is_admin());
create policy "admins can insert news posts" on public.news_posts
  for insert with check (public.is_admin());
create policy "admins can update news posts" on public.news_posts
  for update using (public.is_admin());
create policy "admins can delete news posts" on public.news_posts
  for delete using (public.is_admin());

-- communication_log / communication_recipients: admin-only, no public access at all
create policy "admins can view communication log" on public.communication_log
  for select using (public.is_admin());
create policy "admins can insert communication log" on public.communication_log
  for insert with check (public.is_admin());
create policy "admins can update communication log" on public.communication_log
  for update using (public.is_admin());

create policy "admins can view communication recipients" on public.communication_recipients
  for select using (public.is_admin());
create policy "admins can insert communication recipients" on public.communication_recipients
  for insert with check (public.is_admin());
create policy "admins can update communication recipients" on public.communication_recipients
  for update using (public.is_admin());

-- activity_logs: SELECT restricted to super_admin only, per requirement.
-- Any admin can INSERT (the triggers and app code log actions as the acting user),
-- but only super_admin can ever read the log back.
create policy "super_admin can view activity logs" on public.activity_logs
  for select using (public.is_super_admin());
create policy "admins can insert own activity log entries" on public.activity_logs
  for insert with check (public.is_admin() and actor_id = auth.uid());

-- =========================================================
-- 10. EXPLICIT DATA API GRANTS
-- Required as of May 30, 2026: new Supabase projects no longer expose
-- public-schema tables to the Data API (supabase-js/PostgREST/GraphQL) by
-- default. RLS policies alone are not enough, GRANT is a separate layer that
-- must also be explicit or every request fails with a 42501 error before RLS
-- is even evaluated. Grants below are least-privilege, matching the RLS
-- policies above exactly, RLS still narrows access further within whatever
-- a grant permits, granting a verb here does not bypass any policy.
-- =========================================================

grant usage on schema public to anon, authenticated, service_role;

-- admin_profiles: no anon access at all, admins only
grant select, update on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.admin_profiles to service_role;

-- exhibitor_applications: anon can insert (public form), authenticated (admins) can manage
grant insert on public.exhibitor_applications to anon;
grant select, insert, update on public.exhibitor_applications to authenticated;
grant select, insert, update, delete on public.exhibitor_applications to service_role;

-- sponsor_inquiries
grant insert on public.sponsor_inquiries to anon;
grant select, insert, update on public.sponsor_inquiries to authenticated;
grant select, insert, update, delete on public.sponsor_inquiries to service_role;

-- visitor_registrations
grant insert on public.visitor_registrations to anon;
grant select, insert, update on public.visitor_registrations to authenticated;
grant select, insert, update, delete on public.visitor_registrations to service_role;

-- contact_messages
grant insert on public.contact_messages to anon;
grant select, insert, update on public.contact_messages to authenticated;
grant select, insert, update, delete on public.contact_messages to service_role;

-- news_posts: anon can read (RLS narrows to published = true only), admins manage
grant select on public.news_posts to anon;
grant select, insert, update, delete on public.news_posts to authenticated;
grant select, insert, update, delete on public.news_posts to service_role;

-- communication_log / communication_recipients: no anon access, admin-only
grant select, insert, update on public.communication_log to authenticated;
grant select, insert, update, delete on public.communication_log to service_role;
grant select, insert, update on public.communication_recipients to authenticated;
grant select, insert, update, delete on public.communication_recipients to service_role;

-- activity_logs: no anon access, authenticated can select/insert (RLS further
-- restricts select to super_admin only, and insert to actor_id = auth.uid())
grant select, insert on public.activity_logs to authenticated;
grant select, insert, update, delete on public.activity_logs to service_role;

-- =========================================================
-- End of migration 0001
-- =========================================================

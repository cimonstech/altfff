-- Enable Realtime for the four public-form tables so the admin sidebar can
-- live-update attention badges (INSERT + status UPDATE). Idempotent: skips
-- tables already in the supabase_realtime publication.
--
-- Apply this in the Supabase SQL editor / migration runner, then confirm under
-- Database → Publications (or Replication) that all four tables are listed.

do $$
declare
  t text;
begin
  foreach t in array array[
    'exhibitor_applications',
    'sponsor_inquiries',
    'visitor_registrations',
    'contact_messages'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

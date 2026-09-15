-- Alt.FFF — remove automation / smoke-test form submissions
-- Run in Supabase SQL Editor (postgres / service role — DELETE required).
--
-- 1) Run through section "PREVIEW" only first and check the rows look right.
-- 2) Uncomment the DELETE block when satisfied.
-- 3) Re-run the final verification SELECTs.
--
-- Matches emails created by repo scripts (test-*-gate, enum-test-*, walkin-test-*,
-- *@example.com, *@test.local, dl-test-*@gmail.com, etc.) plus a few one-off
-- addresses left from earlier manual runs.

begin;

-- ---------------------------------------------------------------------------
-- Shared predicate: treat an email as test/automation junk
-- ---------------------------------------------------------------------------
create or replace function pg_temp.is_test_submission_email(p_email text)
returns boolean
language sql
immutable
as $$
  select p_email is not null
    and (
      -- Broad catches used by almost every script
      p_email ilike '%@example.com'
      or p_email ilike '%@test.local'

      -- Prefixed automation inboxes
      or p_email ilike 'dl-test-%@gmail.com'
      or p_email ilike 'mx-test-%@gmail.com'
      or p_email ilike 'enum-test-%@%'
      or p_email ilike 'exhibitor-gate-%@%'
      or p_email ilike 'sponsor-gate-%@%'
      or p_email ilike 'visitor-gate-%@%'
      or p_email ilike 'contact-gate-%@%'
      or p_email ilike 'exhibitor-sec-%@%'
      or p_email ilike 'sponsor-sec-%@%'
      or p_email ilike 'visitor-sec-%@%'
      or p_email ilike 'contact-sec-%@%'
      or p_email ilike 'walkin-test-%@%'
      or p_email ilike 'gate-%@example.com'
      or p_email ilike 'visitor-req-%@%'
      or p_email ilike 'visitor-domain-%@%'
      or p_email ilike 'visitor-no-mc-%@%'
      or p_email ilike 'mc-merge-optout-%@%'
      or p_email ilike 'rt-probe-%@%'
      or p_email ilike 'invite-redirect-%@%'
      or p_email ilike 'vetting-test-%@%'
      or p_email ilike 'guard-test-%@%'
      or p_email ilike 'decline-test-%@%'
      or p_email ilike 'burst-%@%'
      or p_email ilike 'staff-verify-%@%'
      or p_email ilike 'checkin-%@%'
      or p_email ilike 'race15-%@%'
      or p_email ilike 'race2-%@%'
      or p_email ilike 'shared-%@%'
      or p_email ilike 'shared30-%@%'
      or p_email ilike 'diag-%@%'

      -- One-offs from earlier manual / script runs (extend this list if needed)
      or lower(p_email) in (
        'dl-test-d219c67b@gmail.com',
        'dl-test-821e255c@gmail.com',
        'enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com',
        'ugochukwuhapiness@yshoo.vom'
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- PREVIEW — safe to run as-is
-- ---------------------------------------------------------------------------
select 'exhibitor_applications' as table_name, count(*) as rows_to_delete
from public.exhibitor_applications
where pg_temp.is_test_submission_email(email)

union all
select 'sponsor_inquiries', count(*)
from public.sponsor_inquiries
where pg_temp.is_test_submission_email(email)

union all
select 'visitor_registrations', count(*)
from public.visitor_registrations
where pg_temp.is_test_submission_email(email)

union all
select 'contact_messages', count(*)
from public.contact_messages
where pg_temp.is_test_submission_email(email)

order by table_name;

select 'exhibitor_applications' as table_name, id, email, full_name, status, created_at
from public.exhibitor_applications
where pg_temp.is_test_submission_email(email)
order by created_at desc;

select 'sponsor_inquiries' as table_name, id, email, full_name, status, created_at
from public.sponsor_inquiries
where pg_temp.is_test_submission_email(email)
order by created_at desc;

select 'visitor_registrations' as table_name, id, email, full_name, status, created_at
from public.visitor_registrations
where pg_temp.is_test_submission_email(email)
order by created_at desc;

select 'contact_messages' as table_name, id, email, first_name, last_name, status, created_at
from public.contact_messages
where pg_temp.is_test_submission_email(email)
order by created_at desc;

-- ---------------------------------------------------------------------------
-- DELETE — uncomment this whole block after preview looks correct
-- ---------------------------------------------------------------------------
/*
-- Notes tied to rows being removed
delete from public.entity_notes en
where (en.entity_table = 'exhibitor_applications' and en.entity_id in (
  select id from public.exhibitor_applications where pg_temp.is_test_submission_email(email)
))
or (en.entity_table = 'sponsor_inquiries' and en.entity_id in (
  select id from public.sponsor_inquiries where pg_temp.is_test_submission_email(email)
))
or (en.entity_table = 'visitor_registrations' and en.entity_id in (
  select id from public.visitor_registrations where pg_temp.is_test_submission_email(email)
))
or (en.entity_table = 'contact_messages' and en.entity_id in (
  select id from public.contact_messages where pg_temp.is_test_submission_email(email)
));

-- Activity rows pointing at those records (status changes, etc.)
delete from public.activity_logs
where (target_table = 'exhibitor_applications' and target_id in (
  select id from public.exhibitor_applications where pg_temp.is_test_submission_email(email)
))
or (target_table = 'sponsor_inquiries' and target_id in (
  select id from public.sponsor_inquiries where pg_temp.is_test_submission_email(email)
))
or (target_table = 'visitor_registrations' and target_id in (
  select id from public.visitor_registrations where pg_temp.is_test_submission_email(email)
))
or (target_table = 'contact_messages' and target_id in (
  select id from public.contact_messages where pg_temp.is_test_submission_email(email)
));

delete from public.exhibitor_applications
where pg_temp.is_test_submission_email(email);

delete from public.sponsor_inquiries
where pg_temp.is_test_submission_email(email);

delete from public.visitor_registrations
where pg_temp.is_test_submission_email(email);

delete from public.contact_messages
where pg_temp.is_test_submission_email(email);
*/

-- ---------------------------------------------------------------------------
-- VERIFY — should all return 0 after DELETE block runs
-- ---------------------------------------------------------------------------
select 'exhibitor_applications' as table_name, count(*) as remaining
from public.exhibitor_applications
where pg_temp.is_test_submission_email(email)

union all
select 'sponsor_inquiries', count(*)
from public.sponsor_inquiries
where pg_temp.is_test_submission_email(email)

union all
select 'visitor_registrations', count(*)
from public.visitor_registrations
where pg_temp.is_test_submission_email(email)

union all
select 'contact_messages', count(*)
from public.contact_messages
where pg_temp.is_test_submission_email(email)

order by table_name;

commit;

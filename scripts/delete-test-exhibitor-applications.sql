-- Remove test exhibitor application rows (automation / validation leftovers).
-- Run in Supabase SQL Editor. Review the preview SELECT before uncommenting DELETE.
--
-- Rows targeted:
--   Download Test          dl-test-d219c67b@gmail.com
--   Download Test          dl-test-821e255c@gmail.com
--   Enum Test Exhibitor    enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com
--   Ngozi Patrick Joe      ugochukwuhapiness@yshoo.vom  (Top Bella Sartoria)

begin;

-- 1) Preview rows that will be deleted
select
  id,
  full_name,
  company_name,
  email,
  status,
  created_at
from public.exhibitor_applications
where email in (
  'dl-test-d219c67b@gmail.com',
  'dl-test-821e255c@gmail.com',
  'enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com',
  'ugochukwuhapiness@yshoo.vom'
)
order by created_at;

-- 2) Optional: remove status-change audit rows pointing at these applications
delete from public.activity_logs
where target_table = 'exhibitor_applications'
  and target_id in (
    select id
    from public.exhibitor_applications
    where email in (
      'dl-test-d219c67b@gmail.com',
      'dl-test-821e255c@gmail.com',
      'enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com',
      'ugochukwuhapiness@yshoo.vom'
    )
  );

-- 3) Delete the applications
delete from public.exhibitor_applications
where email in (
  'dl-test-d219c67b@gmail.com',
  'dl-test-821e255c@gmail.com',
  'enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com',
  'ugochukwuhapiness@yshoo.vom'
);

-- 4) Confirm none remain
select count(*) as remaining_rows
from public.exhibitor_applications
where email in (
  'dl-test-d219c67b@gmail.com',
  'dl-test-821e255c@gmail.com',
  'enum-test-ex-c69029c5-3b43-48f4-9416-a498d00f35e5@example.com',
  'ugochukwuhapiness@yshoo.vom'
);

commit;

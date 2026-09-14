-- Alt.FFF — seed two visitor rows for SMS / Communications testing
-- Run in Supabase SQL Editor. Safe to re-run (updates if email exists, else inserts).

begin;

-- 1) Batista (real details for live SMS test)
update public.visitor_registrations
set
  full_name = 'Batista',
  phone = '+233553018172',
  status = 'confirmed',
  source = 'pre_registered',
  admin_notes = 'SMS comms test seed — safe to delete after testing',
  updated_at = now()
where lower(email) = lower('batista.simons1@gmail.com');

insert into public.visitor_registrations (
  full_name,
  email,
  phone,
  status,
  source,
  admin_notes
)
select
  'Batista',
  'batista.simons1@gmail.com',
  '+233553018172',
  'confirmed',
  'pre_registered',
  'SMS comms test seed — safe to delete after testing'
where not exists (
  select 1 from public.visitor_registrations where lower(email) = lower('batista.simons1@gmail.com')
);

-- 2) Second test contact (sample name, second phone)
update public.visitor_registrations
set
  full_name = 'Esi Boateng',
  phone = '+233556117046',
  status = 'confirmed',
  source = 'pre_registered',
  admin_notes = 'SMS comms test seed — safe to delete after testing',
  updated_at = now()
where lower(email) = lower('esi.boateng.sms-test@example.com');

insert into public.visitor_registrations (
  full_name,
  email,
  phone,
  status,
  source,
  admin_notes
)
select
  'Esi Boateng',
  'esi.boateng.sms-test@example.com',
  '+233556117046',
  'confirmed',
  'pre_registered',
  'SMS comms test seed — safe to delete after testing'
where not exists (
  select 1 from public.visitor_registrations where lower(email) = lower('esi.boateng.sms-test@example.com')
);

select id, full_name, email, phone, status, created_at
from public.visitor_registrations
where lower(email) in (
  lower('batista.simons1@gmail.com'),
  lower('esi.boateng.sms-test@example.com')
)
order by email;

commit;

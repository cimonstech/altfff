-- Alt.FFF - Migration 0018: unified log for every email and SMS the system sends

create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  message_type text not null,
  subject_or_summary text,
  related_table text,
  related_id uuid,
  status text not null check (status in ('sent', 'failed', 'quota_exceeded')),
  error_detail text,
  sent_at timestamptz not null default now()
);

create index if not exists message_log_recipient_email_idx on public.message_log (recipient_email);
create index if not exists message_log_recipient_phone_idx on public.message_log (recipient_phone);
create index if not exists message_log_related_idx on public.message_log (related_table, related_id);
create index if not exists message_log_sent_at_idx on public.message_log (sent_at desc);
create index if not exists message_log_message_type_idx on public.message_log (message_type);
create index if not exists message_log_status_idx on public.message_log (status);

alter table public.message_log enable row level security;

create policy "Admins can read the message log"
  on public.message_log for select
  using (is_admin());

comment on table public.message_log is 'Every email and SMS sent by the system, regardless of source (transactional or bulk). The single source of truth for the who-received-what admin report.';

grant select on public.message_log to authenticated;
grant select, insert, update, delete on public.message_log to service_role;

-- Backfill historical bulk sends from communication_recipients so the report
-- is not blind to sends that happened before this migration.
insert into public.message_log (
  channel,
  recipient_email,
  recipient_phone,
  recipient_name,
  message_type,
  subject_or_summary,
  related_table,
  related_id,
  status,
  error_detail,
  sent_at
)
select
  case
    when cl.channel = 'sms' then 'sms'
    when cl.channel = 'both' and cr.recipient_email is null and cr.recipient_phone is not null then 'sms'
    else 'email'
  end as channel,
  cr.recipient_email,
  cr.recipient_phone,
  cr.recipient_name,
  case
    when cl.channel = 'sms' then 'bulk_communication_sms'
    when cl.channel = 'both' and cr.recipient_email is null and cr.recipient_phone is not null then 'bulk_communication_sms'
    else 'bulk_communication_email'
  end as message_type,
  coalesce(cl.subject, left(cl.body, 120)) as subject_or_summary,
  'communication_recipients' as related_table,
  cr.id as related_id,
  case
    when cr.status = 'sent' then 'sent'
    when cr.error_message ~* 'quota|daily limit|monthly limit' then 'quota_exceeded'
    else 'failed'
  end as status,
  case when cr.status = 'sent' then null else cr.error_message end as error_detail,
  coalesce(cr.sent_at, cr.created_at) as sent_at
from public.communication_recipients cr
join public.communication_log cl on cl.id = cr.communication_id
where cr.status in ('sent', 'failed')
  and not exists (
    select 1 from public.message_log ml
    where ml.related_table = 'communication_recipients'
      and ml.related_id = cr.id
      and ml.message_type in ('bulk_communication_email', 'bulk_communication_sms')
  );

-- When channel was 'both' and both addresses exist, add a second SMS row if the
-- first insert only captured email (legacy rows store one combined status).
insert into public.message_log (
  channel,
  recipient_email,
  recipient_phone,
  recipient_name,
  message_type,
  subject_or_summary,
  related_table,
  related_id,
  status,
  error_detail,
  sent_at
)
select
  'sms' as channel,
  cr.recipient_email,
  cr.recipient_phone,
  cr.recipient_name,
  'bulk_communication_sms' as message_type,
  left(cl.body, 120) as subject_or_summary,
  'communication_recipients' as related_table,
  cr.id as related_id,
  case
    when cr.status = 'sent' then 'sent'
    when cr.error_message ~* 'SMS:' and cr.error_message !~* 'Email:.*sent' then 'failed'
    when cr.error_message ~* 'quota|daily limit|monthly limit' then 'quota_exceeded'
    when cr.error_message ~* 'SMS:' then 'failed'
    else 'sent'
  end as status,
  case
    when cr.status = 'sent' then null
    when cr.error_message ~* 'SMS:' then cr.error_message
    else null
  end as error_detail,
  coalesce(cr.sent_at, cr.created_at) as sent_at
from public.communication_recipients cr
join public.communication_log cl on cl.id = cr.communication_id
where cl.channel = 'both'
  and cr.recipient_phone is not null
  and cr.status in ('sent', 'failed')
  and not exists (
    select 1 from public.message_log ml
    where ml.related_table = 'communication_recipients'
      and ml.related_id = cr.id
      and ml.message_type = 'bulk_communication_sms'
  );

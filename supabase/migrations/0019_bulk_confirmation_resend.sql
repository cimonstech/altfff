-- Alt.FFF - Migration 0019: bulk confirmation resend batches + message_log.batch_id

alter table public.message_log
  add column if not exists batch_id uuid;

create index if not exists message_log_batch_id_idx on public.message_log (batch_id);

comment on column public.message_log.batch_id is 'Optional batch id grouping bulk confirmation resends (and other batched sends).';

create table if not exists public.bulk_confirmation_resend_batch (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_by uuid references public.admin_profiles(id) on delete set null,
  sent_by_email text,
  mode text not null check (mode in ('all_confirmed', 'resume_quota')),
  resume_from_batch_id uuid references public.bulk_confirmation_resend_batch(id) on delete set null,
  status text not null default 'queuing' check (
    status in ('queuing', 'processing', 'completed', 'paused_quota', 'failed')
  ),
  recipient_count integer not null default 0,
  queued_count integer not null default 0
);

comment on table public.bulk_confirmation_resend_batch is 'Admin bulk resend of QR confirmation emails. Per-visitor outcomes are recorded in message_log via batch_id.';

create index if not exists bulk_confirmation_resend_batch_created_idx
  on public.bulk_confirmation_resend_batch (created_at desc);

alter table public.bulk_confirmation_resend_batch enable row level security;

create policy "Admins can read bulk resend batches"
  on public.bulk_confirmation_resend_batch for select
  using (is_admin());

create policy "Admins can insert bulk resend batches"
  on public.bulk_confirmation_resend_batch for insert
  with check (is_admin());

create policy "Admins can update bulk resend batches"
  on public.bulk_confirmation_resend_batch for update
  using (is_admin());

grant select, insert, update on public.bulk_confirmation_resend_batch to authenticated;
grant select, insert, update, delete on public.bulk_confirmation_resend_batch to service_role;

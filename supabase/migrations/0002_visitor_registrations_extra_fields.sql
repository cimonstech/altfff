-- Alt.FFF — Migration 0002: extend visitor_registrations
-- Save as supabase/migrations/0002_visitor_registrations_extra_fields.sql
-- Apply to BOTH Supabase projects (staging and production) to keep them identical.
--
-- Reason: two visitor-facing forms exist (the quick modal, and a more detailed
-- inline form on /visit). The inline form collects company, job title, country,
-- and an "interest" field that the original visitor_registrations table has no
-- columns for. Rather than silently drop real submitted data or corrupt the
-- heard_about_us column by stuffing unrelated values into it, the table is
-- extended to actually hold what's being collected. All new columns are
-- nullable, since the quick modal form legitimately doesn't collect them and
-- that's fine, not every visitor row needs every field populated.

alter table public.visitor_registrations
  add column if not exists company_name text,
  add column if not exists job_title text,
  add column if not exists country text,
  add column if not exists interest text;

comment on column public.visitor_registrations.company_name is 'Optional, only collected by the inline /visit page form, not the quick modal.';
comment on column public.visitor_registrations.job_title is 'Optional, only collected by the inline /visit page form, not the quick modal.';
comment on column public.visitor_registrations.country is 'Optional, only collected by the inline /visit page form, not the quick modal.';
comment on column public.visitor_registrations.interest is 'Optional, free text. Reflects whatever the inline form''s "interest" dropdown currently offers, matching real UI values, not an invented fixed set.';

-- No RLS or GRANT changes needed: ALTER TABLE ADD COLUMN doesn't require new
-- policies, the existing table-level INSERT/SELECT/UPDATE grants and RLS
-- policies from migration 0001 already cover the table as a whole, new
-- columns are automatically included.

-- =========================================================
-- End of migration 0002
-- =========================================================

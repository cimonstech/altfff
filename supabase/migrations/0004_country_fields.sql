-- Alt.FFF - Migration 0004: add country to exhibitor_applications and sponsor_inquiries
-- Save as supabase/migrations/0004_country_fields.sql
-- Apply to BOTH Supabase projects.
--
-- Reason: exhibitor_applications only has free-text business_location, no
-- structured country. Given eligibility hinges on "manufacturing across
-- Africa," a real country field matters for filtering and reporting, not
-- just phone formatting. Adding to sponsor_inquiries too for consistency,
-- same reasoning applies there. visitor_registrations already has this
-- (migration 0002).

alter table public.exhibitor_applications
  add column if not exists country text;

alter table public.sponsor_inquiries
  add column if not exists country text;

comment on column public.exhibitor_applications.country is 'The country the exhibiting business operates/manufactures in.';
comment on column public.sponsor_inquiries.country is 'The country the sponsoring business operates in.';

-- No RLS/GRANT changes needed, same reasoning as migration 0002.

-- =========================================================
-- End of migration 0004
-- =========================================================
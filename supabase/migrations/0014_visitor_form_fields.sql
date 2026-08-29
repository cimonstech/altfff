-- Alt.FFF — Migration 0014: visitor form field additions
-- social_media_website and business_type are collected by both visitor-facing
-- registration forms. Nullable for existing rows; new submissions require them
-- at the application layer.

alter table public.visitor_registrations
  add column if not exists social_media_website text,
  add column if not exists business_type text;

comment on column public.visitor_registrations.social_media_website is
  'Required on new visitor registrations — website or social profile URL.';

comment on column public.visitor_registrations.business_type is
  'Required on new visitor registrations — b2b, b2c, or both.';

-- =========================================================
-- End of migration 0014
-- =========================================================

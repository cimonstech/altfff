-- Alt.FFF — Migration 0008: newsletter opt-in on the three forms that lack it
-- sponsor_inquiries already has newsletter_opt_in from migration 0001.

alter table public.exhibitor_applications
  add column if not exists newsletter_opt_in boolean not null default false;

alter table public.visitor_registrations
  add column if not exists newsletter_opt_in boolean not null default false;

alter table public.contact_messages
  add column if not exists newsletter_opt_in boolean not null default false;

comment on column public.exhibitor_applications.newsletter_opt_in is 'Explicit consent checkbox. Only true when the submitter checked it. Drives Mailchimp sync, do not sync anyone whose value is false.';
comment on column public.visitor_registrations.newsletter_opt_in is 'Explicit consent checkbox. Only true when the submitter checked it. Drives Mailchimp sync, do not sync anyone whose value is false.';
comment on column public.contact_messages.newsletter_opt_in is 'Explicit consent checkbox. Only true when the submitter checked it. Drives Mailchimp sync, do not sync anyone whose value is false.';

-- No RLS/GRANT changes needed, same reasoning as prior additive migrations.

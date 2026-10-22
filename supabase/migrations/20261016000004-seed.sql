-- Everframe Productions: migration 004, starting data.
-- Package prices are the ones you confirmed. Everything else is empty until you provide it.

insert into public.event_categories (slug, name, sort_order) values
  ('weddings',  'Wedding',               1),
  ('debuts',    'Debut / 7th Birthday',  2),
  ('corporate', 'Corporate Event',       3),
  ('concerts',  'Concert',               4);

insert into public.packages (slug, name, min_hours, max_hours, price, sort_order) values
  ('basic',    'Basic',    1, 2,  8000.00, 1),
  ('standard', 'Standard', 3, 4, 14000.00, 2),
  ('premium',  'Premium',  6, 8, 24000.00, 3);

insert into public.site_settings (key, value) values
  ('studio_name',     '"Everframe Productions"'),
  ('tagline',         '"We freeze the moments you''ll want to relive"'),
  ('timezone',        '"Asia/Manila"'),
  ('currency',        '"PHP"'),
  ('buffer_minutes',  '60'),
  ('messenger_url',   '""'),
  ('contact_email',   '""'),
  ('socials',         '{}'),
  ('service_area',    '""'),
  ('turnaround',      '""'),
  ('stats',           '{"events_shot": null, "years_active": null}');
  
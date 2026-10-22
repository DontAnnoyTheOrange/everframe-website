-- Everframe Productions: migration 004, starting data.
-- Prices and inclusions come from your rate cards (2026-10-16). Contact fields stay empty until you provide them.

insert into public.event_categories (slug, name, sort_order) values
  ('weddings',  'Wedding',               1),
  ('debuts',    'Debut / 7th Birthday',  2),
  ('corporate', 'Corporate Event',       3),
  ('concerts',  'Concert',               4);

-- extra_hour_rate 500 applies to packages with an hour limit. "Any Events" covers the whole event, so no extra hours.
insert into public.packages (slug, service_type, name, price, max_hours, extra_hour_rate, sort_order, inclusions) values
  ('photo-basic',   'photo', 'Basic Events', 3500, 2,    500, 1, array[
     'For 2 hours coverage', '200-300 enhanced photos', 'Unlimited shots',
     'Raw photos sent after the event', '1 week turnaround', 'Google Drive link for files']),
  ('photo-any',     'photo', 'Any Events',   4500, null, null, 2, array[
     'Whole event covered', '300-500 enhanced photos', 'Unlimited shots',
     'Raw photos sent after the event', '1 week turnaround', 'Google Drive link for files']),
  ('video-basic',   'video', 'Basic',        3500, 2,    500, 3, array[
     'Up to 2 hours of coverage', 'One cinematic highlight video (1-3 minutes)', 'Professionally color-graded',
     'High-resolution digital copy', 'Online delivery via Google Drive']),
  ('video-standard','video', 'Standard',     5000, 4,    500, 4, array[
     'Up to 4 hours of coverage', 'Cinematic highlight video (3-5 minutes)', 'Full ceremony or event coverage',
     'Professionally color-graded footage', 'High-resolution digital copy', 'Online delivery via Google Drive',
     'Best for birthdays, debuts, small events and corporate gatherings']),
  ('video-premium', 'video', 'Premium',      7000, 6,    500, 5, array[
     'Up to 6 hours of coverage', 'One cinematic highlight video (5-8 minutes)', 'Full event video (optional)',
     'Professionally color-graded', 'High-resolution digital copy', 'Priority editing',
     'Best for weddings, debuts, birthdays and corporate events']),
  ('combo-standard','photo_video', 'Standard', 8000, 4,  500, 6, array[
     'Up to 4 hours photo and video coverage', 'Professional photography', '3-5 minute cinematic highlight video',
     'Professionally edited photos', 'Professional video color grading', 'Music synchronization',
     'Candid and event coverage', 'High-resolution digital photos and video', 'Online gallery / digital delivery']),
  ('combo-premium', 'photo_video', 'Premium',  11000, 6,  500, 7, array[
     'Up to 6 hours photo and video coverage', 'Professional photography', 'Cinematic highlight video',
     'Full event video', 'Professional photo editing', 'Cinematic video color grading', 'Drone shots',
     'Music synchronization', 'High-resolution digital photos and video', 'Priority editing']);

insert into public.addons (name, price, per_hour, sort_order) values
  ('Priority editing', 700, false, 1);

-- Priority editing is already included in both Premium packages that list it.
insert into public.package_included_addons (package_id, addon_id)
select p.id, a.id from public.packages p, public.addons a
 where a.name = 'Priority editing' and p.slug in ('video-premium', 'combo-premium');

insert into public.site_settings (key, value) values
  ('studio_name',     '"Everframe Productions"'),
  ('tagline',         '"We freeze the moments you''ll want to relive"'),
  ('timezone',        '"Asia/Manila"'),
  ('currency',        '"PHP"'),
  ('buffer_minutes',  '60'),
  ('home_base',       '"Dasmariñas, Cavite"'),
  ('transport_fee',   '500'),
  ('turnaround',      '{"photo": "Edited photos within 1 week after the event", "video": "Edited video within 2 weeks after the event", "photo_video": "Edited photos within 1 week, edited video within 2 weeks after the event"}'),
  ('messenger_url',   '""'),
  ('contact_email',   '""'),
  ('socials',         '{}'),
  ('service_area',    '""'),
  ('stats',           '{"events_shot": null, "years_active": null}');
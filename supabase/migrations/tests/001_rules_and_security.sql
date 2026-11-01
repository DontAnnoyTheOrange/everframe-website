-- Everframe: security and booking-rule tests. Run on a LOCAL test database only (it fakes Supabase roles).
-- Everything runs in one transaction and is rolled back at the end. Any failed check aborts with "TEST FAILED".
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000bb', 'ordinary@test.local');
insert into public.admin_users (user_id, display_name) values ('00000000-0000-0000-0000-0000000000aa', 'Test Admin');

-- Helpers: expect a statement to fail with a given SQLSTATE or message fragment.
create function pg_temp.expect_fail(p_sql text, p_fragment text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_fragment || '%' or sqlstate = p_fragment then return; end if;
    raise exception 'TEST FAILED: % failed with "%" (%), expected "%"', p_sql, sqlerrm, sqlstate, p_fragment;
  end;
  raise exception 'TEST FAILED: expected failure "%" but succeeded: %', p_fragment, p_sql;
end $$;
grant execute on function pg_temp.expect_fail(text, text) to public;

create function pg_temp.assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin if p_ok is not true then raise exception 'TEST FAILED: %', p_msg; end if; end $$;
grant execute on function pg_temp.assert(boolean, text) to public;

-- Seed an unpublished and a published project (as the database owner).
insert into public.portfolio_projects (category_id, slug, title, is_published)
  select id, 'draft-shoot', 'Draft', false from public.event_categories where slug = 'weddings';
insert into public.portfolio_projects (category_id, slug, title, is_published)
  select id, 'live-shoot', 'Live', true from public.event_categories where slug = 'weddings';
insert into public.portfolio_images (project_id, cloudinary_public_id, width, height)
  select id, 'img/' || slug, 100, 100 from public.portfolio_projects;

-- ===== 1. VISITOR (anon) =====
set local role anon;
select pg_temp.assert((select count(*) from public.event_categories) = 5, 'anon sees 5 event types');
select pg_temp.assert((select count(*) from public.packages) = 7, 'anon sees 7 packages');
select pg_temp.assert((select count(*) from public.portfolio_projects) = 1, 'anon sees only the published project');
select pg_temp.assert((select count(*) from public.portfolio_images) = 1, 'anon sees only images of published projects');
select pg_temp.expect_fail('select * from public.bookings', '42501');
select pg_temp.expect_fail('select * from public.availability_blocks', '42501');
select pg_temp.expect_fail('select * from public.admin_users', '42501');
select pg_temp.expect_fail('insert into public.bookings (category_id, client_name, client_email) select id, ''x y'', ''a@b.co'' from public.event_categories limit 1', '42501');
select pg_temp.expect_fail('update public.packages set price = 1', '42501');
select pg_temp.expect_fail('delete from public.event_categories', '42501');
select pg_temp.expect_fail('select public.create_booking_request(null,null,null,null,null,null,null,null,null,null,null)', '42501');
select pg_temp.expect_fail('select public.admin_set_booking_status(gen_random_uuid(), ''confirmed'')', '42501');
select pg_temp.expect_fail('select public.schedule_has_conflict(now(), now())', '42501');
select pg_temp.assert((public.quote_booking((select id from public.packages where slug = 'video-standard'), 4)->>'total')::numeric = 5000, 'anon can quote Video Standard 4h = 5000');
reset role;

-- ===== 2. SERVER (service_role) creates booking requests =====
create temp table t_ids as
  select (select id from public.event_categories where slug = 'debuts') as cat,
         (select id from public.packages where slug = 'video-standard') as std,
         (select id from public.packages where slug = 'photo-basic') as basic,
         date_trunc('day', now()) + interval '40 days' + interval '10 hours' as day1;
grant select on t_ids to public;

set local role service_role;
create temp table t_req1 as select public.create_booking_request(
  (select cat from t_ids), (select std from t_ids), 4, '{}', (select day1 from t_ids),
  'Maria Santos', 'maria@example.com', '09171234567', null, 'Manila Hotel', 'Debut') as r;
select pg_temp.assert((select r->>'status' from t_req1) = 'pending_confirmation', 'new request is pending, not confirmed');
select pg_temp.assert((select (r->>'total_price')::numeric from t_req1) = 5000, 'server computed 5000');
-- 5 hours on a 4-hour package: 1 extra hour at 500 = 5500, not a custom quote.
create temp table t_req2 as select public.create_booking_request(
  (select cat from t_ids), (select std from t_ids), 5, '{}', (select day1 from t_ids) + interval '1 day',
  'Custom Client', 'c@example.com', null, null, null, null) as r;
select pg_temp.assert(not (select (r->>'custom_quote')::boolean from t_req2), '5 hours on Video Standard is priced, not custom');
select pg_temp.assert((select (r->>'total_price')::numeric from t_req2) = 5500, '5 hours on Video Standard = 5000 + 500');
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),4,''{}'',now() - interval ''1 day'',''Past Person'',''p@example.com'',null,null,null,null)', 'date_in_past');
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),4,''{}'',(select day1 from t_ids) + interval ''3 day'',''X'',''p@example.com'',null,null,null,null)', 'violates check constraint');
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),4,''{}'',(select day1 from t_ids) + interval ''3 day'',''No Contact'',null,null,null,null,null)', 'bookings_contact_ck');
-- Two clients may request the same open slot (pending does not hold the date).
create temp table t_req3 as select public.create_booking_request(
  (select cat from t_ids), (select std from t_ids), 4, '{}', (select day1 from t_ids),
  'Second Client', 'second@example.com', null, null, null, null) as r;
reset role;

-- ===== 3. ORDINARY SIGNED-IN USER (not admin) =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000bb', true);
set local role authenticated;
select pg_temp.assert((select count(*) from public.bookings) = 0, 'non-admin sees zero bookings');
select pg_temp.assert((select count(*) from public.admin_users) = 0, 'non-admin cannot see admin list');
select pg_temp.expect_fail('insert into public.admin_users (user_id) values (''00000000-0000-0000-0000-0000000000bb'')', '42501');
select pg_temp.expect_fail('insert into public.packages (slug,service_type,name,max_hours,price) values (''x'',''photo'',''X'',2,1)', 'row-level security');
select pg_temp.expect_fail('select public.admin_set_booking_status(gen_random_uuid(), ''confirmed'')', 'forbidden');
select pg_temp.expect_fail('select public.admin_create_block(now(), now() + interval ''1 day'')', 'forbidden');
select pg_temp.expect_fail('select public.admin_create_booking((select cat from t_ids), null, now() + interval ''90 days'', 2, ''Hack Er'', ''h@example.com'', null, null, null, ''phone'', 1, null)', 'forbidden');
select pg_temp.expect_fail('select public.create_booking_request(null,null,null,null,null,null,null,null,null,null,null)', '42501');
update public.packages set price = 1;  -- silently affects 0 rows under RLS
reset role;
select pg_temp.assert((select price from public.packages where slug = 'photo-basic') = 3500, 'non-admin could not change prices');

-- ===== 4. ADMIN =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select pg_temp.assert((select count(*) from public.bookings) = 3, 'admin sees all bookings');
create temp table t_b as select id, reference_code, starts_at from public.bookings where client_name = 'Maria Santos';
create temp table t_b3 as select id from public.bookings where client_name = 'Second Client';
grant select on t_b, t_b3 to public;
select public.admin_set_booking_status((select id from t_b), 'confirmed', 'Deposit received');
select pg_temp.assert((public.admin_set_booking_status((select id from t_b), 'confirmed')->>'unchanged')::boolean, 'repeat confirm is a harmless no-op');
select pg_temp.expect_fail('select public.admin_set_booking_status((select id from t_b3), ''confirmed'')', 'slot_unavailable');
select pg_temp.expect_fail('select public.admin_set_booking_status((select id from t_b), ''pending_confirmation'')', 'invalid_transition');
select public.admin_set_booking_status((select id from t_b3), 'rejected', 'Date taken');
select pg_temp.expect_fail('select public.admin_set_booking_status((select id from t_b3), ''confirmed'')', 'invalid_transition');
-- Block overlapping a confirmed booking is refused; a free block is accepted.
select pg_temp.expect_fail('select public.admin_create_block((select starts_at from t_b), (select starts_at from t_b) + interval ''1 hour'')', 'conflicts_with_booking');
select public.admin_create_block((select day1 from t_ids) + interval '10 days', (select day1 from t_ids) + interval '11 days', 'Day off');
-- Manual booking: free slot works, overlapping slot fails.
select public.admin_create_booking((select cat from t_ids), (select basic from t_ids), (select day1 from t_ids) + interval '5 days', 2, 'Phone Client', null, '09181234567', null, 'Makati', 'phone', null, 'Called in');
select pg_temp.expect_fail('select public.admin_create_booking((select cat from t_ids), null, (select day1 from t_ids) + interval ''5 days'' + interval ''1 hour'', 2, ''Overlap Client'', null, ''09181234567'', null, null, ''phone'', 5000, null)', 'slot_unavailable');
-- Admin may edit notes; may not edit status or snapshot fields through the patch function.
select public.admin_update_booking((select id from t_b), '{"internal_notes":"VIP, call after 6pm"}');
select pg_temp.expect_fail('select public.admin_update_booking((select id from t_b), ''{"status":"completed"}'')', 'field_not_editable');
-- Direct writes to bookings are not possible even for admin (no write policy / grant).
select pg_temp.expect_fail('update public.bookings set status = ''completed''', '42501');
select pg_temp.assert((select count(*) from public.booking_status_history where booking_id = (select id from t_b)) = 2, 'history has submit + confirm rows');
reset role;

-- ===== 5. AVAILABILITY AS SEEN BY VISITORS =====
set local role anon;
select pg_temp.assert((select count(*) from public.busy_ranges(now(), now() + interval '120 days')) = 3, 'visitor sees 3 busy ranges: 2 bookings + 1 block');
reset role;
set local role service_role;
-- Same slot is now taken.
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),2,''{}'',(select starts_at from t_b) + interval ''30 minutes'',''Late Client'',''l@example.com'',null,null,null,null)', 'slot_unavailable');
-- Buffer: booking ends at +4h; buffer 60 min -> +4h30 is blocked, +5h01 is free.
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),1,''{}'',(select starts_at from t_b) + interval ''4 hours 30 minutes'',''Buffer Client'',''b@example.com'',null,null,null,null)', 'slot_unavailable');
select public.create_booking_request((select cat from t_ids),(select basic from t_ids),1,'{}',(select starts_at from t_b) + interval '5 hours 1 minute','After Buffer','ab@example.com',null,null,null,null);
-- Admin block date is unavailable.
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select std from t_ids),3,''{}'',(select day1 from t_ids) + interval ''10 days'' + interval ''2 hours'',''Block Client'',''bl@example.com'',null,null,null,null)', 'slot_unavailable');
reset role;

-- ===== 6. DATABASE SAFETY NET AND SNAPSHOTS =====
-- Even the database owner cannot create two overlapping confirmed bookings.
select pg_temp.expect_fail('insert into public.bookings (status, category_id, client_name, client_email, starts_at, ends_at) select ''confirmed'', (select cat from t_ids), ''Raw Insert'', ''r@example.com'', starts_at + interval ''1 hour'', starts_at + interval ''2 hours'' from t_b', '23P01');
-- Changing a package price later must not change an existing booking.
update public.packages set price = 99999 where slug = 'video-standard';
select pg_temp.assert((select total_price from public.bookings where id = (select id from t_b)) = 5000, 'existing booking keeps its 5000 snapshot');
select pg_temp.assert((select package_price_snapshot from public.bookings where id = (select id from t_b)) = 5000, 'package price snapshot kept');

-- ===== 7. NEW PRICING RULES (rate cards of 2026-10-16) =====
create temp table t_q as select
  (select id from public.packages where slug = 'photo-any')       as photo_any,
  (select id from public.packages where slug = 'video-basic')     as video_basic,
  (select id from public.packages where slug = 'video-premium')   as video_premium,
  (select id from public.packages where slug = 'combo-standard')  as combo_std,
  (select id from public.packages where slug = 'combo-premium')   as combo_prem,
  (select id from public.addons where name = 'Priority editing')  as priority;
grant select on t_q to public;
set local role anon;
-- Photo "Any Events" covers the whole event: flat 4500 whatever the length.
select pg_temp.assert((public.quote_booking((select photo_any from t_q), 9)->>'total')::numeric = 4500, 'Any Events 9h = 4500 flat');
-- Video Basic, 2h included, 3h booked: 1 extra hour x 500. (4h is past its limit; see section 8.)
select pg_temp.assert((public.quote_booking((select video_basic from t_q), 3)->>'total')::numeric = 4000, 'Video Basic 3h = 3500 + 500');
-- Half hours are not offered.
select pg_temp.expect_fail('select public.quote_booking((select video_basic from t_q), 4.5)', 'invalid_hours');
-- Priority editing: 700 extra on Basic, free on Premium.
select pg_temp.assert((public.quote_booking((select video_basic from t_q), 2, array[(select priority from t_q)])->>'total')::numeric = 4200, 'Priority editing adds 700 to Video Basic');
select pg_temp.assert((public.quote_booking((select video_premium from t_q), 6, array[(select priority from t_q)])->>'total')::numeric = 7000, 'Priority editing is included in Video Premium');
select pg_temp.assert((public.quote_booking((select combo_prem from t_q), 6, array[(select priority from t_q)])->>'total')::numeric = 11000, 'Priority editing is included in Combo Premium');
-- Transport fee when outside Dasmarinas, Cavite.
select pg_temp.assert((public.quote_booking((select combo_std from t_q), 4, '{}', true)->>'total')::numeric = 8500, 'Combo Standard + transport 500 = 8500');
select pg_temp.assert((public.quote_booking((select combo_std from t_q), 4, '{}', false)->>'total')::numeric = 8000, 'Combo Standard inside base area = 8000');
select pg_temp.expect_fail('select public.quote_booking((select video_basic from t_q), 0)', 'invalid_hours');
reset role;
-- Extra hours with no rate set become a custom quote with no total.
update public.packages set extra_hour_rate = null where slug = 'video-basic';
select pg_temp.assert((public.quote_booking((select video_basic from t_q), 3)->>'custom_quote')::boolean, 'no extra-hour rate -> custom quote');
select pg_temp.assert(public.quote_booking((select video_basic from t_q), 3)->'total' = 'null'::jsonb, 'custom quote has no total');
-- Booking stores the whole breakdown.
set local role service_role;
create temp table t_req4 as select public.create_booking_request(
  (select cat from t_ids), (select combo_std from t_q), 5, array[(select priority from t_q)],
  (select day1 from t_ids) + interval '60 days', 'Cavite Client', 'cav@example.com', null, null, 'Tagaytay', null, true) as r;
reset role;
select pg_temp.assert((select (r->>'total_price')::numeric from t_req4) = 9700, '8000 + 500 extra hour + 700 priority + 500 transport = 9700');
select pg_temp.assert((select travel_fee = 500 and extra_hours = 1 and extra_hours_fee = 500 and addons_total = 700 and outside_base_area and service_type_snapshot = 'photo_video'
                         from public.bookings where client_name = 'Cavite Client'), 'booking keeps fee breakdown snapshot');


-- ===== 8. PACKAGE UPGRADE LIMITS (migration 005) =====
-- Earlier tests changed two package rows on purpose; put the rate-card values back first.
update public.packages set price = 5000 where slug = 'video-standard';
update public.packages set extra_hour_rate = 500 where slug = 'video-basic';
create temp table t_p as select slug, id from public.packages;
grant select on t_p to public;
set local role anon;
-- Photo: Basic Events is 2 hours flat, no extra-hour charge. Longer must use Any Events.
select pg_temp.assert((select extra_hour_rate is null from public.packages where slug = 'photo-basic'), 'Photo Basic has no extra-hour rate');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'photo-basic'), 1)->>'total')::numeric = 3500, 'Photo Basic 1h = 3500');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'photo-basic'), 2)->>'total')::numeric = 3500, 'Photo Basic 2h = 3500');
select pg_temp.expect_fail('select public.quote_booking((select id from t_p where slug = ''photo-basic''), 3)', 'package_hours_exceeded');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'photo-any'), 3)->>'total')::numeric = 4500, 'Photo Any Events 3h = 4500');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'photo-any'), 12)->>'total')::numeric = 4500, 'Photo Any Events 12h = 4500 (no extra hours)');
-- Video: Basic 2h (+1 extra hour), Standard 4h (+1), Premium 6h (+ unlimited extra hours at 500).
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-basic'), 2)->>'total')::numeric = 3500, 'Video Basic 2h = 3500');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-basic'), 3)->>'total')::numeric = 4000, 'Video Basic 3h = 4000');
select pg_temp.expect_fail('select public.quote_booking((select id from t_p where slug = ''video-basic''), 4)', 'package_hours_exceeded');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-standard'), 4)->>'total')::numeric = 5000, 'Video Standard 4h = 5000');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-standard'), 5)->>'total')::numeric = 5500, 'Video Standard 5h = 5500');
select pg_temp.expect_fail('select public.quote_booking((select id from t_p where slug = ''video-standard''), 6)', 'package_hours_exceeded');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-premium'), 6)->>'total')::numeric = 7000, 'Video Premium 6h = 7000');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'video-premium'), 8)->>'total')::numeric = 8000, 'Video Premium 8h = 7000 + 2x500');
-- Photo + Video: Standard up to 5h, Premium from 6h with P500 per hour beyond 6.
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'combo-standard'), 5)->>'total')::numeric = 8500, 'Combo Standard 5h = 8500');
select pg_temp.expect_fail('select public.quote_booking((select id from t_p where slug = ''combo-standard''), 6)', 'package_hours_exceeded');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'combo-premium'), 6)->>'total')::numeric = 11000, 'Combo Premium 6h = 11000');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'combo-premium'), 7)->>'total')::numeric = 11500, 'Combo Premium 7h = 11500');
select pg_temp.assert((public.quote_booking((select id from t_p where slug = 'combo-premium'), 7)->>'extra_hours')::numeric = 1, 'Combo Premium 7h has exactly 1 extra hour');
-- A booking request cannot sneak past the limit either.
reset role;
set local role service_role;
select pg_temp.expect_fail('select public.create_booking_request((select cat from t_ids),(select id from t_p where slug = ''photo-basic''),3,''{}'',(select day1 from t_ids) + interval ''80 days'',''Too Long'',''tl@example.com'',null,null,null,null)', 'package_hours_exceeded');
reset role;

-- ===== 9. EVENT TYPES (migration 005) =====
select pg_temp.assert((select count(*) from public.event_categories where is_published) = 5, 'five event types');
select pg_temp.assert(exists (select 1 from public.event_categories where slug = 'debuts' and name = 'Debut / Birthday'), 'Debut renamed, slug kept');
select pg_temp.assert(not exists (select 1 from public.event_categories where name ilike '%7th%'), 'no 7th birthday label left');
select pg_temp.assert((select name from public.event_categories where is_other) = 'Others', 'exactly one Others type');
create temp table t_e as select
  (select id from public.event_categories where slug = 'other')  as oth,
  (select id from public.event_categories where slug = 'weddings') as wed;
grant select on t_e to public;
set local role service_role;
-- Others needs a typed label.
select pg_temp.expect_fail('select public.create_booking_request((select oth from t_e),(select id from t_p where slug = ''photo-basic''),2,''{}'',(select day1 from t_ids) + interval ''81 days'',''No Label'',''nl@example.com'',null,null,null,null)', 'event_type_other_required');
select pg_temp.expect_fail('select public.create_booking_request((select oth from t_e),(select id from t_p where slug = ''photo-basic''),2,''{}'',(select day1 from t_ids) + interval ''81 days'',''Blank Label'',''bl2@example.com'',null,null,null,null,false,''   '')', 'event_type_other_required');
select pg_temp.expect_fail('select public.create_booking_request((select oth from t_e),(select id from t_p where slug = ''photo-basic''),2,''{}'',(select day1 from t_ids) + interval ''81 days'',''One Char'',''oc@example.com'',null,null,null,null,false,''x'')', 'event_type_other_required');
select pg_temp.expect_fail('select public.create_booking_request((select oth from t_e),(select id from t_p where slug = ''photo-basic''),2,''{}'',(select day1 from t_ids) + interval ''81 days'',''Long Label'',''ll@example.com'',null,null,null,null,false,repeat(''a'', 81))', 'event_type_other_required');
-- A good label is cleaned and saved.
create temp table t_o1 as select public.create_booking_request((select oth from t_e),(select id from t_p where slug = 'photo-basic'),2,'{}',
  (select day1 from t_ids) + interval '82 days','Label Client','lc@example.com',null,null,null,null,false,'  Baby   Shower ') as r;
-- Normal types ignore any typed label.
create temp table t_o2 as select public.create_booking_request((select wed from t_e),(select id from t_p where slug = 'photo-basic'),2,'{}',
  (select day1 from t_ids) + interval '83 days','Wedding Client','wc@example.com',null,null,null,null,false,'should be dropped') as r;
-- Inquiries follow the same rule.
select pg_temp.expect_fail('select public.create_inquiry((select oth from t_e),''Inq Client'',''iq@example.com'',null,null,null)', 'event_type_other_required');
create temp table t_o3 as select public.create_inquiry((select oth from t_e),'Inq Client','iq@example.com',null,null,null,'Product Launch') as r;
reset role;
select pg_temp.assert((select event_type_other from public.bookings where client_name = 'Label Client') = 'Baby Shower', 'Others label saved and cleaned');
select pg_temp.assert((select event_type_other is null from public.bookings where client_name = 'Wedding Client'), 'label dropped for a normal event type');
select pg_temp.assert((select event_type_other from public.bookings where client_name = 'Inq Client') = 'Product Launch', 'inquiry keeps the Others label');
-- Admin manual bookings need the label too.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select pg_temp.expect_fail('select public.admin_create_booking((select oth from t_e),(select id from t_p where slug = ''photo-any''),(select day1 from t_ids) + interval ''90 days'',3,''Admin Other'',null,''09171234567'',null,null,''phone'',null,null)', 'event_type_other_required');
select public.admin_create_booking((select oth from t_e),(select id from t_p where slug = 'photo-any'),(select day1 from t_ids) + interval '90 days',3,'Admin Other',null,'09171234567',null,null,'phone',null,null,'{}',false,'Reunion');
reset role;
select pg_temp.assert((select event_type_other from public.bookings where client_name = 'Admin Other') = 'Reunion', 'admin manual booking keeps the Others label');
-- Visitors and signed-in non-admins cannot call the new helper or the old signatures.
set local role anon;
select pg_temp.expect_fail('select public.resolve_event_type((select oth from t_e), ''x y'')', '42501');
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_e),(select id from t_p where slug = ''photo-basic''),2,''{}'',now() + interval ''5 days'',''Anon Try'',''at@example.com'',null,null,null,null)', '42501');
reset role;

-- ===== 10. VENUE LOCATION (migration 006) =====
create temp table t_v as select (select id from public.event_categories where slug = 'weddings') as wed, (select id from public.packages where slug = 'photo-basic') as pk;
grant select on t_v to public;
-- A map-picked venue keeps its place id and coordinates (rounded to 6 decimals).
select set_config('request.jwt.claim.sub', '', true);
create temp table t_v1 as select public.create_booking_request((select wed from t_v),(select pk from t_v),2,'{}',
  now() + interval '120 days','Venue Client','vc@example.com','09171234567',null,'Casa Real, Tagaytay, Cavite',null,false,null,
  'ChIJN1t_tDeuEmsRUsoyG83frY4',14.1153123456,120.9621987654) as r;
select pg_temp.assert((select venue_place_id from public.bookings where client_name = 'Venue Client') = 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'venue place id saved');
select pg_temp.assert((select venue_lat from public.bookings where client_name = 'Venue Client') = 14.115312, 'venue latitude saved and rounded to 6 decimals');
select pg_temp.assert((select venue_lng from public.bookings where client_name = 'Venue Client') = 120.962199, 'venue longitude saved and rounded to 6 decimals');
-- A typed-only venue (no map data) still works.
select public.create_booking_request((select wed from t_v),(select pk from t_v),2,'{}', now() + interval '121 days','Typed Venue','tv@example.com','09171234568',null,'Brgy. Sample, Silang, Cavite',null);
select pg_temp.assert((select venue_lat is null and venue_place_id is null from public.bookings where client_name = 'Typed Venue'), 'typed venue has no coordinates');
-- Bad combinations are refused by the function and by the table.
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_v),(select pk from t_v),2,''{}'', now() + interval ''122 days'',''Half Geo'',''hg@example.com'',''09171234569'',null,''x street'',null,false,null,null,14.1,null)', 'invalid_venue_location');
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_v),(select pk from t_v),2,''{}'', now() + interval ''122 days'',''Place No Geo'',''pg@example.com'',''09171234569'',null,''x street'',null,false,null,''ChIJN1t_tDeuEmsRUsoyG83frY4'',null,null)', 'invalid_venue_location');
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_v),(select pk from t_v),2,''{}'', now() + interval ''122 days'',''Bad Lat'',''bl@example.com'',''09171234569'',null,''x street'',null,false,null,''ChIJN1t_tDeuEmsRUsoyG83frY4'',95,120)', 'bookings_venue_geo_ck');
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_v),(select pk from t_v),2,''{}'', now() + interval ''122 days'',''Bad Place'',''bp@example.com'',''09171234569'',null,''x street'',null,false,null,''bad id!'',14.1,120.9)', 'bookings_venue_place_id_ck');
-- Still server-only.
set local role anon;
select pg_temp.expect_fail('select public.create_booking_request((select wed from t_v),(select pk from t_v),2,''{}'', now() + interval ''5 days'',''Anon Venue'',''av@example.com'',null,null,null,null,false,null,null,14.1,120.9)', '42501');
reset role;

-- ===== 11. EDITING A BOOKING CLEARS A STALE MAP PIN (migration 007) =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
-- Changing only the name keeps the pin.
select public.admin_update_booking((select id from public.bookings where client_name = 'Venue Client'), '{"client_name":"Venue Client Renamed"}');
reset role;
select pg_temp.assert((select venue_lat from public.bookings where client_name = 'Venue Client Renamed') = 14.115312, 'editing the name keeps the map pin');
-- Saving the SAME venue text keeps the pin.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select public.admin_update_booking((select id from public.bookings where client_name = 'Venue Client Renamed'), '{"venue":"Casa Real, Tagaytay, Cavite"}');
reset role;
select pg_temp.assert((select venue_place_id from public.bookings where client_name = 'Venue Client Renamed') is not null, 'same venue text keeps the map pin');
-- A different venue text clears it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select public.admin_update_booking((select id from public.bookings where client_name = 'Venue Client Renamed'), '{"venue":"Another Hall, Imus"}');
reset role;
select pg_temp.assert((select venue_place_id is null and venue_lat is null and venue_lng is null from public.bookings where client_name = 'Venue Client Renamed'), 'a new venue text clears the old map pin');
select pg_temp.assert((select venue from public.bookings where client_name = 'Venue Client Renamed') = 'Another Hall, Imus', 'new venue text saved');

-- ===== 12. FEATURED PROJECTS AND VIDEO LINKS (migration 008) =====
insert into public.portfolio_projects (category_id, slug, title, is_published, is_featured, video_url)
  values ((select id from public.event_categories order by sort_order limit 1), 'feat-test', 'Feat test', true, true, 'https://youtu.be/dQw4w9WgXcQ');
select pg_temp.assert((select is_featured and video_url is not null from public.portfolio_projects where slug = 'feat-test'), 'featured flag and video link are saved');
select pg_temp.assert((select not is_featured and video_url is null from public.portfolio_projects where slug <> 'feat-test' limit 1) is not false, 'existing projects default to not featured, no video');
do $$ begin
  insert into public.portfolio_projects (category_id, slug, title, video_url)
    values ((select id from public.event_categories limit 1), 'bad-video', 'Bad', 'javascript:alert(1)');
  raise exception 'a non-https video link was accepted';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.portfolio_projects (category_id, slug, title, video_url)
    values ((select id from public.event_categories limit 1), 'bad-video2', 'Bad', 'http://youtu.be/abc');
  raise exception 'an http video link was accepted';
exception when check_violation then null; end $$;
-- Visitors can read the new columns only for published projects (same policy as before).
set local role anon;
select pg_temp.assert((select count(*) from public.portfolio_projects where slug = 'feat-test') = 1, 'visitors can read a published featured project');
reset role;

select 'ALL TESTS PASSED' as result;
rollback;
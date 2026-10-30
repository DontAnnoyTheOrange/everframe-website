-- Everframe Productions: migration 005.
--   A. Package hour limits that trigger an automatic move to the next tier.
--   B. Event type changes: "Debut / 7th Birthday" -> "Debut / Birthday", plus an "Others" type with a free-text label.
-- Safe to run once on a project that already ran migrations 001-004. Existing bookings are not changed.

-- ============================================================
-- A. PACKAGE UPGRADE LIMITS
-- ============================================================
-- upgrade_above_hours: the longest booking this package accepts.
--   * null            = no limit (top tier, or a whole-event package)
--   * > max_hours     = hours between max_hours and this limit are charged extra_hour_rate each
--   * = max_hours     = no extra hours are sold; longer bookings must use the next tier
-- The website uses the same numbers to switch the selected package automatically,
-- and the database refuses a quote that goes past the limit (so nobody can bypass the screen).
alter table public.packages
  add column if not exists upgrade_above_hours numeric(4,1)
    check (upgrade_above_hours is null or (upgrade_above_hours > 0 and upgrade_above_hours <= 24));

alter table public.packages drop constraint if exists packages_upgrade_limit_ck;
alter table public.packages add constraint packages_upgrade_limit_ck
  check (upgrade_above_hours is null or max_hours is null or upgrade_above_hours >= max_hours);

-- Photo "Basic Events": 2 hours only. No extra-hour charge; longer than 2 hours means "Any Events".
update public.packages set extra_hour_rate = null, upgrade_above_hours = 2 where slug = 'photo-basic';
-- Video "Basic": 2 hours + up to 1 extra hour (P500). Longer than 3 hours means "Standard".
update public.packages set upgrade_above_hours = 3 where slug = 'video-basic';
-- Standard tiers: 4 hours + up to 1 extra hour (P500). Longer than 5 hours means "Premium".
update public.packages set upgrade_above_hours = 5 where slug in ('video-standard', 'combo-standard');
-- Premium tiers, Any Events: no upgrade limit (upgrade_above_hours stays null). Premium keeps P500 per hour beyond 6.

-- Price breakdown. Same as before, plus the upgrade-limit check.
create or replace function public.quote_booking(
  p_package_id uuid, p_hours numeric, p_addon_ids uuid[] default '{}', p_outside_base boolean default false)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  pkg          public.packages;
  v_lines      jsonb;
  v_addons_sum numeric;
  v_found      integer;
  v_wanted     integer;
  v_extra      numeric := 0;
  v_extra_fee  numeric := 0;
  v_custom     boolean := false;
  v_travel     numeric := 0;
begin
  if p_hours is null or p_hours <= 0 or p_hours > 24 or p_hours <> trunc(p_hours) then
    raise exception 'invalid_hours' using errcode = '22023';
  end if;

  select * into pkg from public.packages where id = p_package_id and is_active;
  if not found then
    raise exception 'package_not_found' using errcode = 'P0002';
  end if;

  -- New: this package does not cover that many hours. The caller must pick the next tier.
  if pkg.upgrade_above_hours is not null and p_hours > pkg.upgrade_above_hours then
    raise exception 'package_hours_exceeded' using errcode = '22023',
      detail = pkg.name || ' covers up to ' || trim(to_char(pkg.upgrade_above_hours, 'FM990.9')) || ' hours.';
  end if;

  if pkg.max_hours is not null and p_hours > pkg.max_hours then
    v_extra := ceil(p_hours - pkg.max_hours);
    if pkg.extra_hour_rate is null then
      v_custom := true;
    else
      v_extra_fee := v_extra * pkg.extra_hour_rate;
    end if;
  end if;

  p_addon_ids := coalesce(p_addon_ids, '{}');
  select count(distinct x) into v_wanted from unnest(p_addon_ids) as x;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'name', x.name, 'unit_price', x.unit_price, 'per_hour', x.per_hour,
           'quantity', x.qty, 'included', x.included, 'line_total', x.line) order by x.sort_order, x.name), '[]'::jsonb),
         coalesce(sum(x.line), 0),
         count(*)
    into v_lines, v_addons_sum, v_found
    from (
      select s.*, case when s.included then 0 else s.unit_price * s.qty end as line
        from (
          select a.id, a.name, a.price as unit_price, a.per_hour, a.sort_order,
                 case when a.per_hour then p_hours else 1 end as qty,
                 exists (select 1 from public.package_included_addons pia
                          where pia.package_id = pkg.id and pia.addon_id = a.id) as included
            from public.addons a
           where a.id = any (p_addon_ids) and a.is_active
        ) s
    ) x;

  if v_found <> v_wanted then
    raise exception 'addon_not_found' using errcode = 'P0002';
  end if;

  if coalesce(p_outside_base, false) then
    v_travel := coalesce((select (value #>> '{}')::numeric from public.site_settings where key = 'transport_fee'), 0);
  end if;

  return jsonb_build_object(
    'package_id', pkg.id,
    'package_name', pkg.name,
    'service_type', pkg.service_type,
    'hours', p_hours,
    'max_hours', pkg.max_hours,
    'upgrade_above_hours', pkg.upgrade_above_hours,
    'base_price', pkg.price,
    'extra_hours', v_extra,
    'extra_hours_fee', v_extra_fee,
    'addons', v_lines,
    'addons_total', v_addons_sum,
    'outside_base_area', coalesce(p_outside_base, false),
    'travel_fee', v_travel,
    'custom_quote', v_custom,
    'total', case when v_custom then null else pkg.price + v_extra_fee + v_addons_sum + v_travel end
  );
end $$;

-- ============================================================
-- B. EVENT TYPES
-- ============================================================
-- is_other marks the "Others" type, which needs the client to type their own event type.
alter table public.event_categories add column if not exists is_other boolean not null default false;

-- The slug 'debuts' is what bookings and URLs point to, so it stays. Only the label changes.
update public.event_categories set name = 'Debut / Birthday' where slug = 'debuts';

insert into public.event_categories (slug, name, sort_order, is_other)
values ('other', 'Others', 5, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_other = true;

-- What the client typed for "Others". Null for every other event type.
alter table public.bookings add column if not exists event_type_other text
  check (event_type_other is null or char_length(event_type_other) between 2 and 80);

-- Checks the event type and returns the cleaned custom label (or null when the type is not "Others").
-- Every function that creates a booking calls this, so the rule cannot be skipped by a hand-made request.
create or replace function public.resolve_event_type(p_category_id uuid, p_other text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_is_other boolean;
  v_clean    text;
begin
  select c.is_other into v_is_other from public.event_categories c where c.id = p_category_id;
  if not found then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;
  if not v_is_other then
    return null; -- a typed label is ignored for normal event types
  end if;
  v_clean := btrim(regexp_replace(coalesce(p_other, ''), '\s+', ' ', 'g'));
  if char_length(v_clean) < 2 or char_length(v_clean) > 80 or v_clean ~ '[[:cntrl:]]' then
    raise exception 'event_type_other_required' using errcode = '22023';
  end if;
  return v_clean;
end $$;

-- The three booking functions gain one trailing parameter (p_event_type_other, default null),
-- which changes their signature, so the old versions are dropped first.
drop function if exists public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean);
drop function if exists public.create_inquiry(uuid, text, text, text, text, text);
drop function if exists public.admin_create_booking(uuid, uuid, timestamptz, numeric, text, text, text, text, text, text, numeric, text, uuid[], boolean);

-- PUBLIC BOOKING REQUEST. Only the server (service_role) may call this.
create or replace function public.create_booking_request(
  p_category_id uuid, p_package_id uuid, p_hours numeric, p_addon_ids uuid[],
  p_starts_at timestamptz, p_client_name text, p_client_email text, p_client_phone text,
  p_client_messenger text, p_venue text, p_message text, p_outside_base boolean default false,
  p_event_type_other text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_quote   jsonb;
  v_ends    timestamptz;
  v_id      uuid;
  v_code    text;
  v_other   text;
begin
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'date_in_past' using errcode = '22023';
  end if;
  if not exists (select 1 from public.event_categories where id = p_category_id and is_published) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;
  v_other := public.resolve_event_type(p_category_id, p_event_type_other);

  perform public.lock_schedule();

  v_quote := public.quote_booking(p_package_id, p_hours, p_addon_ids, p_outside_base);
  v_ends  := p_starts_at + (p_hours * interval '1 hour');

  if public.schedule_has_conflict(p_starts_at, v_ends) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    status, source, category_id, event_type_other, package_id, client_name, client_email, client_phone, client_messenger,
    venue, client_message, starts_at, ends_at, duration_hours,
    package_name_snapshot, package_price_snapshot, service_type_snapshot,
    extra_hours, extra_hours_fee, addons_total, outside_base_area, travel_fee, custom_quote, total_price)
  values (
    'pending_confirmation', 'website', p_category_id, v_other, p_package_id,
    btrim(p_client_name), nullif(btrim(p_client_email), ''), nullif(btrim(p_client_phone), ''),
    nullif(btrim(p_client_messenger), ''), nullif(btrim(p_venue), ''), nullif(btrim(p_message), ''),
    p_starts_at, v_ends, p_hours,
    v_quote->>'package_name', (v_quote->>'base_price')::numeric, v_quote->>'service_type',
    (v_quote->>'extra_hours')::numeric, (v_quote->>'extra_hours_fee')::numeric, (v_quote->>'addons_total')::numeric,
    (v_quote->>'outside_base_area')::boolean, (v_quote->>'travel_fee')::numeric,
    (v_quote->>'custom_quote')::boolean, (v_quote->>'total')::numeric)
  returning id, reference_code into v_id, v_code;

  insert into public.booking_addons (booking_id, addon_id, name_snapshot, unit_price_snapshot, quantity, line_total)
  select v_id, (l->>'id')::uuid, l->>'name', (l->>'unit_price')::numeric, (l->>'quantity')::numeric, (l->>'line_total')::numeric
    from jsonb_array_elements(v_quote->'addons') as l;

  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (v_id, null, 'pending_confirmation', 'Submitted on website');

  return jsonb_build_object('reference_code', v_code, 'status', 'pending_confirmation',
                            'total_price', (v_quote->>'total')::numeric, 'custom_quote', (v_quote->>'custom_quote')::boolean);
end $$;

-- PUBLIC INQUIRY (no date). Server only.
create or replace function public.create_inquiry(
  p_category_id uuid, p_client_name text, p_client_email text, p_client_phone text,
  p_client_messenger text, p_message text, p_event_type_other text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_other text;
begin
  if not exists (select 1 from public.event_categories where id = p_category_id and is_published) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;
  v_other := public.resolve_event_type(p_category_id, p_event_type_other);
  insert into public.bookings (status, source, category_id, event_type_other, client_name, client_email, client_phone, client_messenger, client_message)
  values ('inquiry', 'website', p_category_id, v_other, btrim(p_client_name), nullif(btrim(p_client_email), ''),
          nullif(btrim(p_client_phone), ''), nullif(btrim(p_client_messenger), ''), nullif(btrim(p_message), ''))
  returning id, reference_code into v_id, v_code;
  insert into public.booking_status_history (booking_id, from_status, to_status, note)
  values (v_id, null, 'inquiry', 'Submitted on website');
  return jsonb_build_object('reference_code', v_code, 'status', 'inquiry');
end $$;

-- ADMIN: manual booking (Messenger, phone). Created as confirmed, same conflict rules.
create or replace function public.admin_create_booking(
  p_category_id uuid, p_package_id uuid, p_starts_at timestamptz, p_hours numeric,
  p_client_name text, p_client_email text, p_client_phone text, p_client_messenger text,
  p_venue text, p_source text, p_total_price numeric, p_notes text,
  p_addon_ids uuid[] default '{}', p_outside_base boolean default false,
  p_event_type_other text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_quote  jsonb;
  v_ends   timestamptz;
  v_id     uuid;
  v_code   text;
  v_total  numeric;
  v_custom boolean := false;
  v_other  text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_source not in ('messenger','phone','other','website') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;
  if p_hours is null or p_hours <= 0 or p_hours > 24 or p_hours <> trunc(p_hours) then
    raise exception 'invalid_hours' using errcode = '22023';
  end if;
  v_other := public.resolve_event_type(p_category_id, p_event_type_other);

  perform public.lock_schedule();
  v_ends := p_starts_at + (p_hours * interval '1 hour');
  if public.schedule_has_conflict(p_starts_at, v_ends) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  if p_package_id is not null then
    v_quote  := public.quote_booking(p_package_id, p_hours, p_addon_ids, p_outside_base);
    v_custom := (v_quote->>'custom_quote')::boolean;
    v_total  := coalesce(p_total_price, (v_quote->>'total')::numeric);
  else
    v_total := p_total_price;
  end if;

  insert into public.bookings (
    status, source, category_id, event_type_other, package_id, client_name, client_email, client_phone, client_messenger,
    venue, internal_notes, starts_at, ends_at, duration_hours,
    package_name_snapshot, package_price_snapshot, service_type_snapshot,
    extra_hours, extra_hours_fee, addons_total, outside_base_area, travel_fee, custom_quote, total_price)
  values (
    'confirmed', p_source, p_category_id, v_other, p_package_id, btrim(p_client_name),
    nullif(btrim(p_client_email), ''), nullif(btrim(p_client_phone), ''), nullif(btrim(p_client_messenger), ''),
    nullif(btrim(p_venue), ''), nullif(btrim(p_notes), ''), p_starts_at, v_ends, p_hours,
    v_quote->>'package_name', (v_quote->>'base_price')::numeric, v_quote->>'service_type',
    coalesce((v_quote->>'extra_hours')::numeric, 0), coalesce((v_quote->>'extra_hours_fee')::numeric, 0),
    coalesce((v_quote->>'addons_total')::numeric, 0),
    coalesce((v_quote->>'outside_base_area')::boolean, false), coalesce((v_quote->>'travel_fee')::numeric, 0),
    v_custom and v_total is null, v_total)
  returning id, reference_code into v_id, v_code;

  if v_quote is not null then
    insert into public.booking_addons (booking_id, addon_id, name_snapshot, unit_price_snapshot, quantity, line_total)
    select v_id, (l->>'id')::uuid, l->>'name', (l->>'unit_price')::numeric, (l->>'quantity')::numeric, (l->>'line_total')::numeric
      from jsonb_array_elements(v_quote->'addons') as l;
  end if;

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values (v_id, null, 'confirmed', (select auth.uid()), 'Manual booking (' || p_source || ')');

  return jsonb_build_object('id', v_id, 'reference_code', v_code, 'status', 'confirmed', 'total_price', v_total);
end $$;

-- FUNCTION PERMISSIONS for the new signatures (same pattern as migration 002).
revoke all on function
  public.resolve_event_type(uuid, text),
  public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean, text),
  public.create_inquiry(uuid, text, text, text, text, text, text),
  public.admin_create_booking(uuid, uuid, timestamptz, numeric, text, text, text, text, text, text, numeric, text, uuid[], boolean, text)
from public, anon, authenticated;

grant execute on function public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean, text) to service_role;
grant execute on function public.create_inquiry(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.admin_create_booking(uuid, uuid, timestamptz, numeric, text, text, text, text, text, text, numeric, text, uuid[], boolean, text) to authenticated;
-- quote_booking keeps the grants it already had (create or replace with the same signature does not reset them).
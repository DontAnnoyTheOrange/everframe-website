-- Everframe Productions: migration 006.
-- Saves WHERE the event is: the place the client chose in the map search (place id + exact coordinates).
-- The readable address still lives in bookings.venue. Run once, after migrations 001-005.
-- Existing bookings are not changed (their new columns stay empty).

-- A. New columns --------------------------------------------------------------------------------
alter table public.bookings
  add column if not exists venue_place_id text,
  add column if not exists venue_lat numeric(9,6),
  add column if not exists venue_lng numeric(9,6);

alter table public.bookings drop constraint if exists bookings_venue_place_id_ck;
alter table public.bookings add constraint bookings_venue_place_id_ck
  check (venue_place_id is null or venue_place_id ~ '^[A-Za-z0-9_-]{10,255}$');

alter table public.bookings drop constraint if exists bookings_venue_geo_ck;
alter table public.bookings add constraint bookings_venue_geo_ck
  check ((venue_lat is null) = (venue_lng is null)
         and (venue_lat is null or (venue_lat between -90 and 90 and venue_lng between -180 and 180)));

-- A place id only makes sense together with coordinates.
alter table public.bookings drop constraint if exists bookings_venue_place_needs_geo_ck;
alter table public.bookings add constraint bookings_venue_place_needs_geo_ck
  check (venue_place_id is null or venue_lat is not null);

-- B. Public booking request, now with the venue place ---------------------------------------------
-- The function gains three trailing optional parameters, which changes its signature,
-- so the migration 005 version is dropped first. Everything else is unchanged.
drop function if exists public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean, text);

create or replace function public.create_booking_request(
  p_category_id uuid, p_package_id uuid, p_hours numeric, p_addon_ids uuid[],
  p_starts_at timestamptz, p_client_name text, p_client_email text, p_client_phone text,
  p_client_messenger text, p_venue text, p_message text, p_outside_base boolean default false,
  p_event_type_other text default null,
  p_venue_place_id text default null, p_venue_lat numeric default null, p_venue_lng numeric default null)
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

  -- Coordinates come as a pair, and a place id needs them.
  if (p_venue_lat is null) <> (p_venue_lng is null) or (p_venue_place_id is not null and p_venue_lat is null) then
    raise exception 'invalid_venue_location' using errcode = '22023';
  end if;

  perform public.lock_schedule();

  v_quote := public.quote_booking(p_package_id, p_hours, p_addon_ids, p_outside_base);
  v_ends  := p_starts_at + (p_hours * interval '1 hour');

  if public.schedule_has_conflict(p_starts_at, v_ends) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    status, source, category_id, event_type_other, package_id, client_name, client_email, client_phone, client_messenger,
    venue, venue_place_id, venue_lat, venue_lng, client_message, starts_at, ends_at, duration_hours,
    package_name_snapshot, package_price_snapshot, service_type_snapshot,
    extra_hours, extra_hours_fee, addons_total, outside_base_area, travel_fee, custom_quote, total_price)
  values (
    'pending_confirmation', 'website', p_category_id, v_other, p_package_id,
    btrim(p_client_name), nullif(btrim(p_client_email), ''), nullif(btrim(p_client_phone), ''),
    nullif(btrim(p_client_messenger), ''), nullif(btrim(p_venue), ''),
    nullif(btrim(p_venue_place_id), ''), round(p_venue_lat, 6), round(p_venue_lng, 6),
    nullif(btrim(p_message), ''),
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

-- Same permissions as before: only the server (service_role) may call it.
revoke all on function
  public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean, text, text, numeric, numeric)
from public, anon, authenticated;
grant execute on function
  public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text, boolean, text, text, numeric, numeric)
to service_role;
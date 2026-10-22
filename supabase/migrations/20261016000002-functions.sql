-- Everframe Productions: migration 002, business rules as database functions.
-- Prices, availability and booking creation are decided HERE, never by the browser.

-- Is the signed-in user an administrator? SECURITY DEFINER so it can read admin_users
-- without recursive policies. Fixed search_path prevents hijacking.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

create or replace function public.schedule_buffer_minutes()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'buffer_minutes'), 60);
$$;

-- Same lock key used everywhere the schedule can change, so changes happen one at a time.
create or replace function public.lock_schedule()
returns void language sql security definer set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended('everframe_schedule', 0));
$$;

-- Does [p_start, p_end) clash with a confirmed booking (plus buffer) or an admin block?
create or replace function public.schedule_has_conflict(
  p_start timestamptz, p_end timestamptz, p_exclude_booking uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  with buf as (select public.schedule_buffer_minutes() * interval '1 minute' as b)
  select exists (
           select 1 from public.bookings bk, buf
           where bk.status = 'confirmed'
             and bk.id is distinct from p_exclude_booking
             and tstzrange(bk.starts_at - buf.b, bk.ends_at + buf.b, '[)') && tstzrange(p_start, p_end, '[)'))
      or exists (
           select 1 from public.availability_blocks ab
           where ab.during && tstzrange(p_start, p_end, '[)'));
$$;

-- Price breakdown. The calculator and the booking function both use this one function.
-- Hours outside the package's range give a custom quote (total = null).
create or replace function public.quote_booking(
  p_package_id uuid, p_hours numeric, p_addon_ids uuid[] default '{}')
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  pkg          public.packages;
  v_lines      jsonb;
  v_addons_sum numeric;
  v_found      integer;
  v_wanted     integer;
  v_in_range   boolean;
begin
  if p_hours is null or p_hours <= 0 or p_hours > 24 then
    raise exception 'invalid_hours' using errcode = '22023';
  end if;

  select * into pkg from public.packages where id = p_package_id and is_active;
  if not found then
    raise exception 'package_not_found' using errcode = 'P0002';
  end if;

  p_addon_ids := coalesce(p_addon_ids, '{}');
  select count(distinct x) into v_wanted from unnest(p_addon_ids) as x;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'name', a.name, 'unit_price', a.price, 'per_hour', a.per_hour,
           'quantity', case when a.per_hour then p_hours else 1 end,
           'line_total', a.price * case when a.per_hour then p_hours else 1 end) order by a.sort_order, a.name), '[]'::jsonb),
         coalesce(sum(a.price * case when a.per_hour then p_hours else 1 end), 0),
         count(*)
    into v_lines, v_addons_sum, v_found
    from public.addons a
   where a.id = any (p_addon_ids) and a.is_active;

  if v_found <> v_wanted then
    raise exception 'addon_not_found' using errcode = 'P0002';
  end if;

  v_in_range := p_hours between pkg.min_hours and pkg.max_hours;

  return jsonb_build_object(
    'package_id', pkg.id,
    'package_name', pkg.name,
    'hours', p_hours,
    'base_price', pkg.price,
    'addons', v_lines,
    'addons_total', v_addons_sum,
    'custom_quote', not v_in_range,
    'total', case when v_in_range then pkg.price + v_addons_sum end
  );
end $$;

-- Busy time ranges for the public calendar. Returns NO names or contact data.
create or replace function public.busy_ranges(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz, kind text)
language plpgsql stable security definer set search_path = '' as $$
declare v_buf interval := public.schedule_buffer_minutes() * interval '1 minute';
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  return query
    select bk.starts_at - v_buf, bk.ends_at + v_buf, 'booking'::text
      from public.bookings bk
     where bk.status = 'confirmed' and bk.during && tstzrange(p_from - v_buf, p_to + v_buf, '[)')
    union all
    select ab.starts_at, ab.ends_at, 'block'::text
      from public.availability_blocks ab
     where ab.during && tstzrange(p_from, p_to, '[)')
    order by 1;
end $$;

-- Which status changes are legal.
create or replace function public.booking_transition_allowed(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select (p_from, p_to) in (
    ('inquiry','pending_confirmation'), ('inquiry','rejected'), ('inquiry','cancelled'),
    ('pending_confirmation','confirmed'), ('pending_confirmation','rejected'), ('pending_confirmation','cancelled'),
    ('confirmed','completed'), ('confirmed','cancelled'));
$$;

-- PUBLIC BOOKING REQUEST. Only the server (service_role) may call this.
-- Creates a pending_confirmation booking. It never confirms anything.
create or replace function public.create_booking_request(
  p_category_id uuid, p_package_id uuid, p_hours numeric, p_addon_ids uuid[],
  p_starts_at timestamptz, p_client_name text, p_client_email text, p_client_phone text,
  p_client_messenger text, p_venue text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_quote   jsonb;
  v_ends    timestamptz;
  v_id      uuid;
  v_code    text;
begin
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'date_in_past' using errcode = '22023';
  end if;
  if not exists (select 1 from public.event_categories where id = p_category_id and is_published) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;

  perform public.lock_schedule();

  v_quote := public.quote_booking(p_package_id, p_hours, p_addon_ids);
  v_ends  := p_starts_at + (p_hours * interval '1 hour');

  if public.schedule_has_conflict(p_starts_at, v_ends) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    status, source, category_id, package_id, client_name, client_email, client_phone, client_messenger,
    venue, client_message, starts_at, ends_at, duration_hours,
    package_name_snapshot, package_price_snapshot, addons_total, custom_quote, total_price)
  values (
    'pending_confirmation', 'website', p_category_id, p_package_id,
    btrim(p_client_name), nullif(btrim(p_client_email), ''), nullif(btrim(p_client_phone), ''),
    nullif(btrim(p_client_messenger), ''), nullif(btrim(p_venue), ''), nullif(btrim(p_message), ''),
    p_starts_at, v_ends, p_hours,
    v_quote->>'package_name', (v_quote->>'base_price')::numeric, (v_quote->>'addons_total')::numeric,
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
  p_client_messenger text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text;
begin
  if not exists (select 1 from public.event_categories where id = p_category_id and is_published) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;
  insert into public.bookings (status, source, category_id, client_name, client_email, client_phone, client_messenger, client_message)
  values ('inquiry', 'website', p_category_id, btrim(p_client_name), nullif(btrim(p_client_email), ''),
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
  p_venue text, p_source text, p_total_price numeric, p_notes text, p_addon_ids uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_quote  jsonb;
  v_ends   timestamptz;
  v_id     uuid;
  v_code   text;
  v_total  numeric;
  v_custom boolean := false;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_source not in ('messenger','phone','other','website') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;
  if p_hours is null or p_hours <= 0 or p_hours > 24 then
    raise exception 'invalid_hours' using errcode = '22023';
  end if;

  perform public.lock_schedule();
  v_ends := p_starts_at + (p_hours * interval '1 hour');
  if public.schedule_has_conflict(p_starts_at, v_ends) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  if p_package_id is not null then
    v_quote  := public.quote_booking(p_package_id, p_hours, p_addon_ids);
    v_custom := (v_quote->>'custom_quote')::boolean;
    v_total  := coalesce(p_total_price, (v_quote->>'total')::numeric);
  else
    v_total := p_total_price;
  end if;

  insert into public.bookings (
    status, source, category_id, package_id, client_name, client_email, client_phone, client_messenger,
    venue, internal_notes, starts_at, ends_at, duration_hours,
    package_name_snapshot, package_price_snapshot, addons_total, custom_quote, total_price)
  values (
    'confirmed', p_source, p_category_id, p_package_id, btrim(p_client_name),
    nullif(btrim(p_client_email), ''), nullif(btrim(p_client_phone), ''), nullif(btrim(p_client_messenger), ''),
    nullif(btrim(p_venue), ''), nullif(btrim(p_notes), ''), p_starts_at, v_ends, p_hours,
    v_quote->>'package_name', (v_quote->>'base_price')::numeric, coalesce((v_quote->>'addons_total')::numeric, 0),
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

-- ADMIN: change a booking's status. Enforces legal transitions and re-checks conflicts on confirm.
create or replace function public.admin_set_booking_status(
  p_booking_id uuid, p_new_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare bk public.bookings;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  perform public.lock_schedule();
  select * into bk from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found' using errcode = 'P0002'; end if;

  -- Double click or repeated request: nothing to do.
  if bk.status = p_new_status then
    return jsonb_build_object('id', bk.id, 'status', bk.status, 'unchanged', true);
  end if;

  if not public.booking_transition_allowed(bk.status, p_new_status) then
    raise exception 'invalid_transition' using errcode = 'P0001',
      detail = bk.status || ' -> ' || coalesce(p_new_status, 'null');
  end if;

  if p_new_status = 'confirmed' and public.schedule_has_conflict(bk.starts_at, bk.ends_at, bk.id) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  update public.bookings set status = p_new_status where id = bk.id;
  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values (bk.id, bk.status, p_new_status, (select auth.uid()), p_note);

  return jsonb_build_object('id', bk.id, 'status', p_new_status, 'unchanged', false);
end $$;

-- ADMIN: edit contact details, notes, venue, and (re)schedule. Rescheduling a confirmed booking re-checks conflicts.
create or replace function public.admin_update_booking(p_booking_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  bk        public.bookings;
  k         text;
  v_start   timestamptz;
  v_hours   numeric;
  v_end     timestamptz;
  v_allowed text[] := array['client_name','client_email','client_phone','client_messenger','venue',
                            'client_message','internal_notes','starts_at','duration_hours','total_price'];
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any (v_allowed)) then
      raise exception 'field_not_editable: %', k using errcode = '22023';
    end if;
  end loop;

  perform public.lock_schedule();
  select * into bk from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found' using errcode = 'P0002'; end if;

  v_start := case when p_patch ? 'starts_at' then (p_patch->>'starts_at')::timestamptz else bk.starts_at end;
  v_hours := case when p_patch ? 'duration_hours' then (p_patch->>'duration_hours')::numeric else bk.duration_hours end;
  v_end   := case when v_start is not null and v_hours is not null then v_start + (v_hours * interval '1 hour') else bk.ends_at end;

  if bk.status = 'confirmed' and v_start is not null
     and (v_start is distinct from bk.starts_at or v_end is distinct from bk.ends_at)
     and public.schedule_has_conflict(v_start, v_end, bk.id) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  update public.bookings set
    client_name      = case when p_patch ? 'client_name'      then p_patch->>'client_name'      else client_name end,
    client_email     = case when p_patch ? 'client_email'     then nullif(p_patch->>'client_email', '')     else client_email end,
    client_phone     = case when p_patch ? 'client_phone'     then nullif(p_patch->>'client_phone', '')     else client_phone end,
    client_messenger = case when p_patch ? 'client_messenger' then nullif(p_patch->>'client_messenger', '') else client_messenger end,
    venue            = case when p_patch ? 'venue'            then nullif(p_patch->>'venue', '')            else venue end,
    client_message   = case when p_patch ? 'client_message'   then nullif(p_patch->>'client_message', '')   else client_message end,
    internal_notes   = case when p_patch ? 'internal_notes'   then nullif(p_patch->>'internal_notes', '')   else internal_notes end,
    total_price      = case when p_patch ? 'total_price'      then (p_patch->>'total_price')::numeric       else total_price end,
    custom_quote     = case when p_patch ? 'total_price' and (p_patch->>'total_price') is not null then false else custom_quote end,
    starts_at        = v_start,
    ends_at          = v_end,
    duration_hours   = v_hours
  where id = bk.id;

  return jsonb_build_object('id', bk.id, 'updated', true);
end $$;

-- ADMIN: block a date range. Refused if it would overlap a confirmed booking.
create or replace function public.admin_create_block(p_start timestamptz, p_end timestamptz, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid_range' using errcode = '22023';
  end if;

  perform public.lock_schedule();
  if exists (select 1 from public.bookings bk
             where bk.status = 'confirmed' and bk.during && tstzrange(p_start, p_end, '[)')) then
    raise exception 'conflicts_with_booking' using errcode = 'P0001';
  end if;

  insert into public.availability_blocks (starts_at, ends_at, reason, created_by)
  values (p_start, p_end, nullif(btrim(p_reason), ''), (select auth.uid()))
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- FUNCTION PERMISSIONS. By default Postgres lets everyone run new functions, so lock them all first.
revoke all on function
  public.is_admin(), public.schedule_buffer_minutes(), public.lock_schedule(),
  public.schedule_has_conflict(timestamptz, timestamptz, uuid),
  public.quote_booking(uuid, numeric, uuid[]), public.busy_ranges(timestamptz, timestamptz),
  public.booking_transition_allowed(text, text),
  public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text),
  public.create_inquiry(uuid, text, text, text, text, text),
  public.admin_create_booking(uuid, uuid, timestamptz, numeric, text, text, text, text, text, text, numeric, text, uuid[]),
  public.admin_set_booking_status(uuid, text, text),
  public.admin_update_booking(uuid, jsonb),
  public.admin_create_block(timestamptz, timestamptz, text)
from public, anon, authenticated;

-- Needed by RLS policies and the public pages.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.quote_booking(uuid, numeric, uuid[]) to anon, authenticated;
grant execute on function public.busy_ranges(timestamptz, timestamptz) to anon, authenticated;
-- Admin tools: the function itself checks is_admin().
grant execute on function public.admin_create_booking(uuid, uuid, timestamptz, numeric, text, text, text, text, text, text, numeric, text, uuid[]) to authenticated;
grant execute on function public.admin_set_booking_status(uuid, text, text) to authenticated;
grant execute on function public.admin_update_booking(uuid, jsonb) to authenticated;
grant execute on function public.admin_create_block(timestamptz, timestamptz, text) to authenticated;
-- Public submissions go through the Next.js server only (service role key, never in the browser).
grant execute on function public.create_booking_request(uuid, uuid, numeric, uuid[], timestamptz, text, text, text, text, text, text) to service_role;
grant execute on function public.create_inquiry(uuid, text, text, text, text, text) to service_role;
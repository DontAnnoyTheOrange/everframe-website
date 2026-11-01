-- Everframe Productions: migration 007.
-- Editing a booking's venue text now clears its map pin, so the admin screen never shows an old
-- pin next to a new address. Nothing else about admin_update_booking changes. Run once, after 001-006.

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
    -- A changed venue text no longer matches the map pin, so the pin is cleared (it can be set again by the client).
    venue_place_id   = case when p_patch ? 'venue' and nullif(p_patch->>'venue', '') is distinct from bk.venue then null else venue_place_id end,
    venue_lat        = case when p_patch ? 'venue' and nullif(p_patch->>'venue', '') is distinct from bk.venue then null else venue_lat end,
    venue_lng        = case when p_patch ? 'venue' and nullif(p_patch->>'venue', '') is distinct from bk.venue then null else venue_lng end,
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
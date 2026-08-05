-- Fichaje seguro: identidad autenticada, geocerca validada en servidor y
-- coordenadas independientes para ingreso y egreso.
begin;

alter table public.staff_attendance
  add column if not exists check_in_latitude numeric(10,7),
  add column if not exists check_in_longitude numeric(10,7),
  add column if not exists check_in_accuracy numeric(10,2),
  add column if not exists check_in_distance_meters numeric(10,2),
  add column if not exists check_in_location_address text,
  add column if not exists check_out_latitude numeric(10,7),
  add column if not exists check_out_longitude numeric(10,7),
  add column if not exists check_out_accuracy numeric(10,2),
  add column if not exists check_out_distance_meters numeric(10,2),
  add column if not exists check_out_location_address text;

-- Preservar la información histórica disponible en las columnas heredadas.
update public.staff_attendance
set
  check_in_latitude = coalesce(check_in_latitude, latitude),
  check_in_longitude = coalesce(check_in_longitude, longitude),
  check_in_accuracy = coalesce(check_in_accuracy, gps_accuracy),
  check_in_location_address = coalesce(check_in_location_address, location_address),
  check_out_latitude = case when check_out_time is not null then coalesce(check_out_latitude, latitude) else check_out_latitude end,
  check_out_longitude = case when check_out_time is not null then coalesce(check_out_longitude, longitude) else check_out_longitude end,
  check_out_accuracy = case when check_out_time is not null then coalesce(check_out_accuracy, gps_accuracy) else check_out_accuracy end,
  check_out_location_address = case when check_out_time is not null then coalesce(check_out_location_address, location_address) else check_out_location_address end;

create or replace function public.record_staff_attendance(
  p_staff_id text,
  p_action text,
  p_latitude numeric,
  p_longitude numeric,
  p_location_address text,
  p_gps_accuracy numeric
)
returns public.staff_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  target_staff public.users_accounts;
  attendance public.staff_attendance;
  normalized_action text := upper(trim(p_action));
  hours_value numeric;
  distance_value numeric;
  store_latitude constant numeric := -33.1256089;
  store_longitude constant numeric := -64.3502370;
  allowed_radius_meters constant numeric := 100;
  max_accuracy_meters constant numeric := 150;
  store_address constant text := 'Constitución 944, Río Cuarto, Córdoba';
begin
  if auth.uid() is null then
    raise exception 'attendance permission denied' using errcode = '42501';
  end if;

  select * into target_staff
  from public.users_accounts
  where id = p_staff_id
    and auth_user_id = auth.uid()
    and active = true;
  if not found then
    raise exception 'attendance permission denied' using errcode = '42501';
  end if;

  if normalized_action not in ('INGRESO', 'EGRESO') then
    raise exception 'invalid attendance action' using errcode = '22023';
  end if;
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'invalid GPS coordinates' using errcode = '22023';
  end if;
  if p_gps_accuracy is null or p_gps_accuracy <= 0 or p_gps_accuracy > max_accuracy_meters then
    raise exception 'GPS accuracy exceeds allowed maximum' using errcode = '22023';
  end if;

  distance_value := round((
    6371000 * acos(least(1, greatest(-1,
      sin(radians(store_latitude)) * sin(radians(p_latitude)) +
      cos(radians(store_latitude)) * cos(radians(p_latitude)) *
      cos(radians(p_longitude - store_longitude))
    )))
  )::numeric, 2);

  if distance_value > allowed_radius_meters then
    raise exception 'outside attendance geofence' using errcode = '22023';
  end if;

  -- Evita dos operaciones simultáneas sobre el mismo empleado.
  perform pg_advisory_xact_lock(hashtextextended(p_staff_id, 0));

  if normalized_action = 'INGRESO' then
    if exists (
      select 1 from public.staff_attendance
      where staff_id = p_staff_id and check_in_time is not null and check_out_time is null
    ) then
      raise exception 'staff already has an open shift' using errcode = '23505';
    end if;

    insert into public.staff_attendance(
      staff_id,
      staff_name,
      date,
      check_in_time,
      status,
      latitude,
      longitude,
      location_address,
      gps_accuracy,
      check_in_latitude,
      check_in_longitude,
      check_in_accuracy,
      check_in_distance_meters,
      check_in_location_address
    ) values (
      p_staff_id,
      target_staff.name,
      current_date,
      now(),
      'presente',
      p_latitude,
      p_longitude,
      store_address,
      p_gps_accuracy,
      p_latitude,
      p_longitude,
      p_gps_accuracy,
      distance_value,
      store_address
    ) returning * into attendance;
  else
    select * into attendance
    from public.staff_attendance
    where staff_id = p_staff_id and check_in_time is not null and check_out_time is null
    order by check_in_time desc
    limit 1
    for update;
    if not found then
      raise exception 'staff has no open shift' using errcode = 'P0002';
    end if;

    hours_value := round(
      (extract(epoch from (now() - attendance.check_in_time)) / 3600.0)::numeric,
      2
    );
    update public.staff_attendance
    set
      check_out_time = now(),
      hours_worked = greatest(hours_value, 0),
      overtime_hours = greatest(hours_value - 8, 0),
      daily_total = greatest(hours_value, 0) * hourly_rate,
      status = 'finalizado',
      latitude = p_latitude,
      longitude = p_longitude,
      location_address = store_address,
      gps_accuracy = p_gps_accuracy,
      check_out_latitude = p_latitude,
      check_out_longitude = p_longitude,
      check_out_accuracy = p_gps_accuracy,
      check_out_distance_meters = distance_value,
      check_out_location_address = store_address
    where id = attendance.id
    returning * into attendance;
  end if;

  insert into public.audit_logs(actor_id, action, entity_name, entity_id, payload)
  values (
    auth.uid(),
    'attendance.' || lower(normalized_action),
    'staff_attendance',
    attendance.id,
    jsonb_build_object(
      'staff_id', p_staff_id,
      'latitude', p_latitude,
      'longitude', p_longitude,
      'accuracy_meters', p_gps_accuracy,
      'distance_meters', distance_value,
      'source', 'browser_geolocation'
    )
  );

  return attendance;
end;
$$;

revoke all on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) from public;
grant execute on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) to authenticated;

comment on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric)
  is 'Registra ingreso/egreso del usuario autenticado dentro de la geocerca de Constitución 944.';

commit;

-- Reconcile the legacy attendance table with the canonical timestamp schema.

begin;

do $$
declare
  check_in_type text;
  check_out_type text;
begin
  select data_type into check_in_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'staff_attendance'
    and column_name = 'check_in_time';

  if check_in_type in ('text', 'character varying', 'character') then
    execute $sql$
      alter table public.staff_attendance
      alter column check_in_time type timestamptz
      using (
        case
          when check_in_time is null or trim(check_in_time) = '' then null
          when trim(check_in_time) ~ '^\d{4}-\d{2}-\d{2}'
            then trim(check_in_time)::timestamptz
          when trim(check_in_time) ~ '^\d{1,2}:\d{2}'
            then ((date::text || ' ' || trim(check_in_time))::timestamp
              at time zone 'America/Argentina/Cordoba')
          else coalesce(created_at::timestamptz, now())
        end
      )
    $sql$;
  end if;

  select data_type into check_out_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'staff_attendance'
    and column_name = 'check_out_time';

  if check_out_type in ('text', 'character varying', 'character') then
    execute $sql$
      alter table public.staff_attendance
      alter column check_out_time type timestamptz
      using (
        case
          when check_out_time is null or trim(check_out_time) = '' then null
          when trim(check_out_time) ~ '^\d{4}-\d{2}-\d{2}'
            then trim(check_out_time)::timestamptz
          when trim(check_out_time) ~ '^\d{1,2}:\d{2}'
            then ((date::text || ' ' || trim(check_out_time))::timestamp
              at time zone 'America/Argentina/Cordoba')
          else null
        end
      )
    $sql$;
  end if;
end
$$;

update public.staff_attendance
set
  hours_worked = coalesce(hours_worked, 0),
  overtime_hours = coalesce(overtime_hours, 0),
  hourly_rate = coalesce(hourly_rate, 0),
  daily_total = coalesce(daily_total, 0),
  status = coalesce(nullif(trim(status), ''), 'presente'),
  created_at = coalesce(created_at, now());

alter table public.staff_attendance alter column id set default gen_random_uuid()::text;
alter table public.staff_attendance alter column hours_worked set default 0;
alter table public.staff_attendance alter column hours_worked set not null;
alter table public.staff_attendance alter column overtime_hours set default 0;
alter table public.staff_attendance alter column overtime_hours set not null;
alter table public.staff_attendance alter column hourly_rate set default 0;
alter table public.staff_attendance alter column hourly_rate set not null;
alter table public.staff_attendance alter column daily_total set default 0;
alter table public.staff_attendance alter column daily_total set not null;
alter table public.staff_attendance alter column status set default 'presente';
alter table public.staff_attendance alter column status set not null;
alter table public.staff_attendance alter column created_at set default now();
alter table public.staff_attendance alter column created_at set not null;

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
begin
  select * into target_staff
  from public.users_accounts
  where id = p_staff_id and active = true;
  if not found then
    raise exception 'active staff profile not found' using errcode = 'P0002';
  end if;
  if auth.uid() is null or (
    target_staff.auth_user_id <> auth.uid()
    and not public.is_staff_role(array['administrador','dueño'])
  ) then
    raise exception 'attendance permission denied' using errcode = '42501';
  end if;
  if normalized_action not in ('INGRESO','EGRESO') then
    raise exception 'invalid attendance action' using errcode = '22023';
  end if;
  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180 then
    raise exception 'invalid GPS coordinates' using errcode = '22023';
  end if;

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
      gps_accuracy
    )
    values (
      p_staff_id,
      target_staff.name,
      current_date,
      now(),
      'presente',
      p_latitude,
      p_longitude,
      nullif(trim(p_location_address), ''),
      greatest(coalesce(p_gps_accuracy, 0), 0)
    )
    returning * into attendance;
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
      location_address = nullif(trim(p_location_address), ''),
      gps_accuracy = greatest(coalesce(p_gps_accuracy, 0), 0)
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
      'hours_worked', attendance.hours_worked
    )
  );
  return attendance;
end;
$$;

revoke all on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) from public;
grant execute on function public.record_staff_attendance(text, text, numeric, numeric, text, numeric) to authenticated;

commit;

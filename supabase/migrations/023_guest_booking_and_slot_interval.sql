-- 023_guest_booking_and_slot_interval.sql
-- Reserva sem conta + intervalo configurável da grade de horários.
-- Mantém duração real do serviço, conflitos, bloqueios e isolamento por tenant.

begin;

alter table public.business_settings
  add column if not exists slot_interval_minutes integer not null default 30;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_settings_slot_interval_check'
      and conrelid = 'public.business_settings'::regclass
  ) then
    alter table public.business_settings
      add constraint business_settings_slot_interval_check
      check (slot_interval_minutes in (15, 30, 45, 60));
  end if;
end;
$$;

alter table public.appointments
  alter column client_id drop not null;

alter table public.appointments
  add column if not exists public_reference text;

create unique index if not exists appointments_public_reference_unique
  on public.appointments(public_reference)
  where public_reference is not null;

create or replace function public.available_slots(
  tenant uuid,
  barber uuid,
  service uuid,
  day date
)
returns table(
  "startAt" timestamptz,
  "endAt" timestamptz,
  label text
)
language sql
security definer
stable
set search_path = public
as $$
select distinct
  slot.start_at,
  slot.start_at + make_interval(mins => s.duration_minutes),
  to_char(slot.start_at at time zone b.timezone, 'HH24:MI')
from public.barbershops b
join public.services s
  on s.id = service
 and s.barbershop_id = b.id
 and s.is_active
join public.barbers br
  on br.id = barber
 and br.barbershop_id = b.id
 and br.is_active
join public.barber_services bs
  on bs.barber_id = br.id
 and bs.service_id = s.id
 and bs.barbershop_id = b.id
 and bs.is_active
join public.business_hours h
  on h.barber_id = br.id
 and h.barbershop_id = b.id
 and h.is_active
 and h.day_of_week = extract(dow from day)::int
join public.business_settings cfg
  on cfg.barbershop_id = b.id
cross join lateral generate_series(
  (day + h.start_time) at time zone b.timezone,
  (day + h.end_time) at time zone b.timezone
    - make_interval(mins => s.duration_minutes),
  make_interval(mins => coalesce(cfg.slot_interval_minutes, 30))
) slot(start_at)
where b.id = tenant
  and b.is_active
  and day >= (now() at time zone b.timezone)::date
  and slot.start_at > now()
  and slot.start_at <= now()
    + make_interval(days => cfg.booking_advance_days)
  and not (
    h.break_start is not null
    and h.break_end is not null
    and slot.start_at < ((day + h.break_end) at time zone b.timezone)
    and slot.start_at + make_interval(mins => s.duration_minutes)
      > ((day + h.break_start) at time zone b.timezone)
  )
  and not exists (
    select 1
    from public.appointments a
    where a.barber_id = br.id
      and a.status in ('pending', 'confirmed')
      and a.start_at
        < slot.start_at + make_interval(mins => s.duration_minutes)
      and a.end_at > slot.start_at
  )
  and not exists (
    select 1
    from public.blocked_slots bl
    where bl.barber_id = br.id
      and bl.start_at
        < slot.start_at + make_interval(mins => s.duration_minutes)
      and bl.end_at > slot.start_at
  )
order by 1;
$$;

revoke all
on function public.available_slots(uuid, uuid, uuid, date)
from public;

grant execute
on function public.available_slots(uuid, uuid, uuid, date)
to anon, authenticated;

create or replace function public.book_guest_appointment(
  target_barbershop_id uuid,
  target_barber_id uuid,
  target_service_id uuid,
  target_start_at timestamptz,
  guest_name text,
  guest_phone text,
  guest_email text default null,
  target_client_notes text default null
)
returns table(
  appointment_id uuid,
  booking_reference text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_service public.services%rowtype;
  selected_barbershop public.barbershops%rowtype;
  selected_settings public.business_settings%rowtype;
  customer_record public.customers%rowtype;
  target_end_at timestamptz;
  local_start timestamp;
  local_end timestamp;
  normalized_phone text;
  normalized_email text;
  generated_reference text;
  created_appointment_id uuid;
  active_guest_bookings integer;
begin
  normalized_phone := regexp_replace(coalesce(guest_phone, ''), '\D', '', 'g');
  normalized_email := nullif(lower(trim(coalesce(guest_email, ''))), '');

  if guest_name is null
    or length(trim(guest_name)) not between 2 and 100
    or normalized_phone !~ '^[0-9]{10,13}$'
    or (
      normalized_email is not null
      and (
        length(normalized_email) > 254
        or normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      )
    )
  then
    raise exception 'INVALID_GUEST';
  end if;

  if target_start_at <= now() then
    raise exception 'PAST_APPOINTMENT';
  end if;

  if char_length(coalesce(target_client_notes, '')) > 500 then
    raise exception 'NOTES_TOO_LONG';
  end if;

  select *
  into selected_barbershop
  from public.barbershops
  where id = target_barbershop_id
    and is_active = true;

  if not found then
    raise exception 'BARBERSHOP_UNAVAILABLE';
  end if;

  select *
  into selected_service
  from public.services
  where id = target_service_id
    and barbershop_id = target_barbershop_id
    and is_active = true;

  if not found then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  if not exists (
    select 1
    from public.barber_services
    where barbershop_id = target_barbershop_id
      and barber_id = target_barber_id
      and service_id = target_service_id
      and is_active = true
  ) then
    raise exception 'BARBER_SERVICE_UNAVAILABLE';
  end if;

  perform 1
  from public.barbers
  where id = target_barber_id
    and barbershop_id = target_barbershop_id
    and is_active
  for update;

  if not found then
    raise exception 'BARBER_UNAVAILABLE';
  end if;

  select *
  into selected_settings
  from public.business_settings
  where barbershop_id = target_barbershop_id;

  if target_start_at > now()
    + make_interval(days => coalesce(selected_settings.booking_advance_days, 30))
  then
    raise exception 'ADVANCE_LIMIT';
  end if;

  target_end_at :=
    target_start_at
    + make_interval(mins => selected_service.duration_minutes);

  local_start :=
    target_start_at at time zone selected_barbershop.timezone;

  local_end :=
    target_end_at at time zone selected_barbershop.timezone;

  if local_start::date <> local_end::date then
    raise exception 'OUTSIDE_BUSINESS_HOURS';
  end if;

  if not exists (
    select 1
    from public.business_hours h
    where h.barbershop_id = target_barbershop_id
      and h.barber_id = target_barber_id
      and h.is_active = true
      and h.day_of_week = extract(dow from local_start)::integer
      and local_start::time >= h.start_time
      and local_end::time <= h.end_time
      and not (
        h.break_start is not null
        and h.break_end is not null
        and local_start::time < h.break_end
        and local_end::time > h.break_start
      )
  ) then
    raise exception 'OUTSIDE_BUSINESS_HOURS';
  end if;

  if exists (
    select 1
    from public.blocked_slots b
    where b.barbershop_id = target_barbershop_id
      and b.barber_id = target_barber_id
      and tstzrange(b.start_at, b.end_at, '[)')
        && tstzrange(target_start_at, target_end_at, '[)')
  ) then
    raise exception 'SLOT_BLOCKED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      target_barbershop_id::text || ':' || normalized_phone,
      0
    )
  );

  select *
  into customer_record
  from public.customers
  where barbershop_id = target_barbershop_id
    and profile_id is null
    and phone = normalized_phone
  order by updated_at desc
  limit 1
  for update;

  if not found then
    insert into public.customers (
      barbershop_id,
      profile_id,
      full_name,
      email,
      phone,
      allow_email,
      allow_whatsapp
    )
    values (
      target_barbershop_id,
      null,
      trim(guest_name),
      normalized_email,
      normalized_phone,
      normalized_email is not null,
      false
    )
    returning *
    into customer_record;
  else
    update public.customers
    set
      full_name = trim(guest_name),
      email = coalesce(normalized_email, email),
      updated_at = now()
    where id = customer_record.id
    returning *
    into customer_record;
  end if;

  select count(*)
  into active_guest_bookings
  from public.appointments
  where barbershop_id = target_barbershop_id
    and customer_id = customer_record.id
    and status in ('pending', 'confirmed')
    and end_at > now();

  if active_guest_bookings >= 3 then
    raise exception 'GUEST_ACTIVE_LIMIT';
  end if;

  loop
    generated_reference :=
      'AG-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));

    exit when not exists (
      select 1
      from public.appointments
      where public_reference = generated_reference
    );
  end loop;

  insert into public.appointments (
    barbershop_id,
    customer_id,
    client_id,
    barber_id,
    service_id,
    start_at,
    end_at,
    status,
    total_price,
    client_notes,
    public_reference
  )
  values (
    target_barbershop_id,
    customer_record.id,
    null,
    target_barber_id,
    target_service_id,
    target_start_at,
    target_end_at,
    'pending',
    selected_service.price,
    nullif(trim(target_client_notes), ''),
    generated_reference
  )
  returning id
  into created_appointment_id;

  insert into public.appointment_events (
    barbershop_id,
    appointment_id,
    event_type,
    description,
    created_by
  )
  values (
    target_barbershop_id,
    created_appointment_id,
    'created_by_guest',
    'Reserva criada sem conta pelo cliente.',
    null
  );

  appointment_id := created_appointment_id;
  booking_reference := generated_reference;

  return next;
exception
  when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE';
end;
$$;

revoke all
on function public.book_guest_appointment(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.book_guest_appointment(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text
)
to anon, authenticated;

commit;

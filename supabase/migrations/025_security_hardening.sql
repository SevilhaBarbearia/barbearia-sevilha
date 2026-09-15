-- 025_security_hardening.sql
-- Hardening da agenda: impede horários fora da grade configurada mesmo
-- quando alguém tenta chamar as RPCs diretamente, sem usar a interface.

begin;

create or replace function public.enforce_appointment_slot_alignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_timezone text;
  selected_interval integer;
  local_start timestamp;
  slot_seconds numeric;
  aligned boolean;
begin
  select
    b.timezone,
    coalesce(cfg.slot_interval_minutes, 30)
  into
    selected_timezone,
    selected_interval
  from public.barbershops b
  left join public.business_settings cfg
    on cfg.barbershop_id = b.id
  where b.id = new.barbershop_id
    and b.is_active = true;

  if not found then
    raise exception 'BARBERSHOP_UNAVAILABLE';
  end if;

  if selected_interval not in (15, 30, 45, 60) then
    raise exception 'INVALID_SLOT_INTERVAL';
  end if;

  local_start :=
    new.start_at
    at time zone selected_timezone;

  slot_seconds :=
    selected_interval * 60;

  select exists (
    select 1
    from public.business_hours h
    where h.barbershop_id = new.barbershop_id
      and h.barber_id = new.barber_id
      and h.is_active = true
      and h.day_of_week =
        extract(dow from local_start)::integer
      and local_start::time >= h.start_time
      and local_start::time < h.end_time
      and mod(
        extract(
          epoch from (
            local_start::time - h.start_time
          )
        ),
        slot_seconds
      ) = 0
  )
  into aligned;

  if not aligned then
    raise exception 'INVALID_SLOT_ALIGNMENT';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_appointment_slot_alignment
on public.appointments;

create trigger enforce_appointment_slot_alignment
before insert or update of
  start_at,
  barber_id,
  barbershop_id
on public.appointments
for each row
execute function public.enforce_appointment_slot_alignment();

commit;

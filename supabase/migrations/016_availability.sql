begin;
create or replace function public.available_slots(tenant uuid, barber uuid, service uuid, day date)
returns table("startAt" timestamptz, "endAt" timestamptz, label text)
language sql security definer stable set search_path=public as $$
select distinct slot.start_at,slot.start_at+make_interval(mins=>s.duration_minutes),
to_char(slot.start_at at time zone b.timezone,'HH24:MI')
from public.barbershops b
join public.services s on s.id=service and s.barbershop_id=b.id and s.is_active
join public.barbers br on br.id=barber and br.barbershop_id=b.id and br.is_active
join public.barber_services bs on bs.barber_id=br.id and bs.service_id=s.id and bs.barbershop_id=b.id and bs.is_active
join public.business_hours h on h.barber_id=br.id and h.barbershop_id=b.id and h.is_active and h.day_of_week=extract(dow from day)::int
join public.business_settings cfg on cfg.barbershop_id=b.id
cross join lateral generate_series((day+h.start_time) at time zone b.timezone,
 (day+h.end_time) at time zone b.timezone - make_interval(mins=>s.duration_minutes),interval '15 minutes') slot(start_at)
where b.id=tenant and b.is_active and day>= (now() at time zone b.timezone)::date
and slot.start_at>now() and slot.start_at<=now()+make_interval(days=>cfg.booking_advance_days)
and not (h.break_start is not null and h.break_end is not null and
 slot.start_at<((day+h.break_end) at time zone b.timezone) and slot.start_at+make_interval(mins=>s.duration_minutes)>((day+h.break_start) at time zone b.timezone))
and not exists(select 1 from public.appointments a where a.barber_id=br.id and a.status in ('pending','confirmed') and a.start_at<slot.start_at+make_interval(mins=>s.duration_minutes) and a.end_at>slot.start_at)
and not exists(select 1 from public.blocked_slots bl where bl.barber_id=br.id and bl.start_at<slot.start_at+make_interval(mins=>s.duration_minutes) and bl.end_at>slot.start_at)
order by 1;
$$;
revoke all on function public.available_slots(uuid,uuid,uuid,date) from public;
grant execute on function public.available_slots(uuid,uuid,uuid,date) to anon,authenticated;
commit;

begin;
create or replace function public.barbershop_day_bounds(tenant uuid)
returns table(start_at timestamptz,end_at timestamptz)
language sql security definer stable set search_path=public as $$
 select ((now() at time zone timezone)::date)::timestamp at time zone timezone,
 (((now() at time zone timezone)::date)+1)::timestamp at time zone timezone
 from public.barbershops where id=tenant and is_active;
$$;
revoke all on function public.barbershop_day_bounds(uuid) from public;
grant execute on function public.barbershop_day_bounds(uuid) to anon,authenticated;
commit;

begin;
create or replace function public.create_barber_block(tenant uuid,barber uuid,local_start timestamp,local_end timestamp,block_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare zone text;
begin
 if not public.can_manage_barbershop(tenant) then raise exception 'FORBIDDEN'; end if;
 select timezone into zone from public.barbershops where id=tenant;
 if local_start is null or local_end is null or local_end<=local_start or length(block_reason)>300 then raise exception 'INVALID_BLOCK'; end if;
 insert into public.blocked_slots(barbershop_id,barber_id,start_at,end_at,reason,created_by)
 values(tenant,barber,local_start at time zone zone,local_end at time zone zone,block_reason,auth.uid());
end; $$;
revoke all on function public.create_barber_block(uuid,uuid,timestamp,timestamp,text) from public;
grant execute on function public.create_barber_block(uuid,uuid,timestamp,timestamp,text) to authenticated;
commit;

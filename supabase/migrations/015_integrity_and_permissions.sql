begin;

-- Eu mantenho uma única relação por entidade para o PostgREST resolver os joins sem ambiguidade.
alter table public.barber_services drop constraint barber_services_barber_id_fkey, drop constraint barber_services_service_id_fkey;
alter table public.business_hours drop constraint business_hours_barber_id_fkey;
alter table public.blocked_slots drop constraint blocked_slots_barber_id_fkey;
alter table public.appointments drop constraint appointments_barber_id_fkey, drop constraint appointments_service_id_fkey, drop constraint appointments_customer_fk;
alter table public.appointment_events drop constraint appointment_events_appointment_id_fkey;
alter table public.presencial_payments drop constraint presencial_payments_appointment_id_fkey;
alter table public.loyalty_service_rules drop constraint loyalty_service_rules_service_id_fkey;
alter table public.loyalty_rewards drop constraint loyalty_rewards_service_id_fkey;
alter table public.loyalty_accounts drop constraint loyalty_accounts_customer_id_fkey;
alter table public.loyalty_transactions drop constraint loyalty_transactions_customer_id_fkey, drop constraint loyalty_transactions_appointment_id_fkey;
alter table public.appointment_feedback drop constraint appointment_feedback_appointment_id_fkey, drop constraint appointment_feedback_customer_id_fkey, drop constraint appointment_feedback_barber_id_fkey;
alter table public.loyalty_programs add unique (id, barbershop_id);
alter table public.loyalty_rewards add unique (id, barbershop_id);
alter table public.loyalty_service_rules drop constraint loyalty_service_rules_loyalty_program_id_fkey;
alter table public.loyalty_service_rules add foreign key (loyalty_program_id, barbershop_id) references public.loyalty_programs(id,barbershop_id);
alter table public.loyalty_rewards drop constraint loyalty_rewards_loyalty_program_id_fkey;
alter table public.loyalty_rewards add foreign key (loyalty_program_id, barbershop_id) references public.loyalty_programs(id,barbershop_id);
alter table public.loyalty_transactions drop constraint loyalty_transactions_reward_id_fkey;
alter table public.loyalty_transactions add foreign key (reward_id,barbershop_id) references public.loyalty_rewards(id,barbershop_id);

-- Eu exijo as funções transacionais mesmo quando alguém chama a API fora do formulário.
revoke insert, update, delete on public.appointments from anon, authenticated;
revoke insert, update, delete on public.loyalty_accounts, public.loyalty_transactions, public.appointment_feedback, public.outbound_notifications from anon, authenticated;
revoke all on public.outbound_notifications from anon, authenticated;
grant select(id,barbershop_id,type,channel,status,scheduled_at,sent_at,attempts,error_message) on public.outbound_notifications to authenticated;
revoke all on public.barbershops from anon, authenticated;
grant select on public.barbershops to anon, authenticated;
grant update(name,description,logo_url,cover_url,primary_color,secondary_color) on public.barbershops to authenticated;
revoke all on public.customers from anon, authenticated;
grant select,insert on public.customers to authenticated;
grant update(full_name,email,phone,birth_date,allow_email,allow_whatsapp,updated_at) on public.customers to authenticated;
revoke update(is_platform_admin) on public.profiles from public,anon,authenticated;
drop policy profiles_select_scope on public.profiles;
create policy profiles_select_scope on public.profiles for select using (id=auth.uid() or public.is_platform_admin());

create or replace function public.can_manage_barbershop(target_barbershop uuid)
returns boolean language sql security definer stable set search_path=public as $$
select public.is_platform_admin() or (
 public.is_password_session() and exists (
 select 1 from public.barbershop_members m join public.profiles p on p.id=m.profile_id
 join public.barbershops b on b.id=m.barbershop_id
 where m.barbershop_id=target_barbershop and m.profile_id=auth.uid()
 and m.role in ('owner','manager') and m.is_active and p.is_active and b.is_active));
$$;

-- Eu serializo alterações de bloqueio e reservas pelo mesmo barbeiro.
create or replace function public.lock_barber_schedule() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform 1 from public.barbers where id=new.barber_id for update;
 if tg_table_name='blocked_slots' and exists (
 select 1 from public.appointments a where a.barber_id=new.barber_id and a.status in ('pending','confirmed')
 and a.start_at<new.end_at and a.end_at>new.start_at) then
 raise exception 'Existe uma reserva ativa nesse intervalo.';
 end if;
 return new;
end; $$;
create trigger lock_block_schedule before insert or update on public.blocked_slots for each row execute function public.lock_barber_schedule();

create or replace function public.replace_barber_hours(tenant uuid, barber uuid, hours jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_barbershop(tenant) then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.barbers where id=barber and barbershop_id=tenant for update;
 if not found then raise exception 'BARBER_NOT_FOUND'; end if;
 delete from public.business_hours where barber_id=barber and barbershop_id=tenant;
 insert into public.business_hours(barbershop_id,barber_id,day_of_week,start_time,end_time,break_start,break_end,is_active)
 select tenant,barber,h.day_of_week,h.start_time,h.end_time,h.break_start,h.break_end,h.is_active
 from jsonb_to_recordset(hours) as h(day_of_week int,start_time time,end_time time,break_start time,break_end time,is_active boolean);
end; $$;
revoke all on function public.replace_barber_hours(uuid,uuid,jsonb) from public;
grant execute on function public.replace_barber_hours(uuid,uuid,jsonb) to authenticated;
commit;

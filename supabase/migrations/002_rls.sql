-- 002_rls.sql
-- Segurança por Row Level Security.

alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;
alter table public.presencial_payments enable row level security;
alter table public.business_settings enable row level security;

create or replace function public.current_profile_role()
returns public.profile_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_profile_role() = 'admin';
$$;

create or replace function public.is_barber_profile(target_barber uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.barbers b
    where b.id = target_barber
      and b.profile_id = auth.uid()
      and b.is_active = true
  );
$$;

-- PROFILES
create policy profiles_select_own_or_admin on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

create policy profiles_update_own_contact on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Serviços e barbeiros ativos podem ser lidos publicamente para a vitrine e reserva.
create policy services_public_read_active on public.services
for select using (is_active = true or public.is_admin());

create policy services_admin_all on public.services
for all using (public.is_admin()) with check (public.is_admin());

create policy barbers_public_read_active on public.barbers
for select using (is_active = true or public.is_admin() or public.is_barber_profile(id));

create policy barbers_admin_all on public.barbers
for all using (public.is_admin()) with check (public.is_admin());

create policy barber_services_public_read_active on public.barber_services
for select using (is_active = true or public.is_admin());

create policy barber_services_admin_all on public.barber_services
for all using (public.is_admin()) with check (public.is_admin());

-- Horários precisam ser lidos para cálculo de disponibilidade; escrita só admin.
create policy business_hours_public_read_active on public.business_hours
for select using (is_active = true or public.is_admin() or public.is_barber_profile(barber_id));

create policy business_hours_admin_all on public.business_hours
for all using (public.is_admin()) with check (public.is_admin());

create policy blocked_slots_select_scope on public.blocked_slots
for select using (public.is_admin() or public.is_barber_profile(barber_id));

create policy blocked_slots_admin_or_barber_all on public.blocked_slots
for all using (public.is_admin() or public.is_barber_profile(barber_id))
with check (public.is_admin() or public.is_barber_profile(barber_id));

-- Appointments
create policy appointments_select_scope on public.appointments
for select using (
  client_id = auth.uid()
  or public.is_admin()
  or public.is_barber_profile(barber_id)
);

create policy appointments_client_insert_own on public.appointments
for insert with check (client_id = auth.uid());

create policy appointments_update_scope on public.appointments
for update using (
  client_id = auth.uid()
  or public.is_admin()
  or public.is_barber_profile(barber_id)
)
with check (
  client_id = auth.uid()
  or public.is_admin()
  or public.is_barber_profile(barber_id)
);

-- Eventos: cliente vê eventos dos próprios agendamentos; admin/barbeiro vê seus escopos.
create policy appointment_events_select_scope on public.appointment_events
for select using (
  public.is_admin()
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.client_id = auth.uid() or public.is_barber_profile(a.barber_id))
  )
);

create policy appointment_events_insert_authenticated on public.appointment_events
for insert with check (auth.uid() is not null);

-- Pagamentos: somente admin/barbeiro autorizado gerencia; cliente pode visualizar o próprio status.
create policy presencial_payments_select_scope on public.presencial_payments
for select using (
  public.is_admin()
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.client_id = auth.uid() or public.is_barber_profile(a.barber_id))
  )
);

create policy presencial_payments_admin_or_barber_all on public.presencial_payments
for all using (
  public.is_admin()
  or exists (select 1 from public.appointments a where a.id = appointment_id and public.is_barber_profile(a.barber_id))
)
with check (
  public.is_admin()
  or exists (select 1 from public.appointments a where a.id = appointment_id and public.is_barber_profile(a.barber_id))
);

create policy business_settings_public_read on public.business_settings
for select using (true);

create policy business_settings_admin_all on public.business_settings
for all using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.services, public.barbers, public.barber_services, public.business_hours, public.business_settings, public.appointment_busy_slots, public.blocked_busy_slots to anon, authenticated;
grant select, insert, update, delete on public.blocked_slots to authenticated;
grant select, insert on public.appointments to authenticated;
grant update on public.appointments to authenticated;
grant select, insert on public.appointment_events to authenticated;
grant select, insert, update on public.presencial_payments to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name, email, phone, avatar_url, updated_at, last_login_at) on public.profiles to authenticated;

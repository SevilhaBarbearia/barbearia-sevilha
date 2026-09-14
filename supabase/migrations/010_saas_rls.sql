-- 010_saas_rls.sql
-- Eu centralizo a autorização por tenant para impedir consultas cruzadas entre barbearias.

begin;

create or replace function public.is_password_session()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"password"}]'::jsonb;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_platform_admin = true and is_active = true
  ) and public.is_password_session();
$$;

create or replace function public.is_barbershop_member(target_barbershop uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.barbershop_members
    where barbershop_id = target_barbershop
      and profile_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.can_manage_barbershop(target_barbershop uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_platform_admin() or (
    public.is_password_session() and exists (
      select 1 from public.barbershop_members
      where barbershop_id = target_barbershop
        and profile_id = auth.uid()
        and role in ('owner', 'manager')
        and is_active = true
    )
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.barbershop_members
    where profile_id = auth.uid()
      and role in ('owner', 'manager')
      and is_active = true
  ) and public.is_password_session();
$$;

alter table public.organizations enable row level security;
alter table public.barbershops enable row level security;
alter table public.barbershop_members enable row level security;
alter table public.customers enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_update_own_contact on public.profiles;
create policy profiles_select_scope on public.profiles for select using (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.customers c
    where c.profile_id = profiles.id
      and public.can_manage_barbershop(c.barbershop_id)
  )
);
create policy profiles_update_own_contact on public.profiles for update
using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

create policy organizations_member_read on public.organizations for select using (
  public.is_platform_admin()
  or exists (
    select 1 from public.barbershops b
    where b.organization_id = organizations.id and public.is_barbershop_member(b.id)
  )
);
create policy organizations_platform_write on public.organizations for all
using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy barbershops_public_read_active on public.barbershops for select using (
  is_active = true or public.is_barbershop_member(id) or public.is_platform_admin()
);
create policy barbershops_manager_update on public.barbershops for update
using (public.can_manage_barbershop(id)) with check (public.can_manage_barbershop(id));
create policy barbershops_platform_insert on public.barbershops for insert
with check (public.is_platform_admin());
create policy barbershops_platform_delete on public.barbershops for delete
using (public.is_platform_admin());

create policy members_select_scope on public.barbershop_members for select using (
  profile_id = auth.uid() or public.can_manage_barbershop(barbershop_id)
);
create policy members_manage_scope on public.barbershop_members for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

create policy customers_select_scope on public.customers for select using (
  profile_id = auth.uid() or public.can_manage_barbershop(barbershop_id)
);
create policy customers_insert_own_or_manager on public.customers for insert with check (
  profile_id = auth.uid() or public.can_manage_barbershop(barbershop_id)
);
create policy customers_update_scope on public.customers for update
using (profile_id = auth.uid() or public.can_manage_barbershop(barbershop_id))
with check (profile_id = auth.uid() or public.can_manage_barbershop(barbershop_id));

drop policy if exists services_public_read_active on public.services;
drop policy if exists services_admin_all on public.services;
create policy services_public_read_active on public.services for select using (
  is_active = true or public.can_manage_barbershop(barbershop_id)
);
create policy services_manage_tenant on public.services for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

drop policy if exists barbers_public_read_active on public.barbers;
drop policy if exists barbers_admin_all on public.barbers;
create policy barbers_public_read_active on public.barbers for select using (
  is_active = true or public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(id)
);
create policy barbers_manage_tenant on public.barbers for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

drop policy if exists barber_services_public_read_active on public.barber_services;
drop policy if exists barber_services_admin_all on public.barber_services;
create policy barber_services_public_read_active on public.barber_services for select using (
  is_active = true or public.can_manage_barbershop(barbershop_id)
);
create policy barber_services_manage_tenant on public.barber_services for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

drop policy if exists business_hours_public_read_active on public.business_hours;
drop policy if exists business_hours_admin_all on public.business_hours;
create policy business_hours_public_read_active on public.business_hours for select using (
  is_active = true or public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id)
);
create policy business_hours_manage_tenant on public.business_hours for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

drop policy if exists blocked_slots_select_scope on public.blocked_slots;
drop policy if exists blocked_slots_admin_or_barber_all on public.blocked_slots;
create policy blocked_slots_select_scope on public.blocked_slots for select using (
  public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id)
);
create policy blocked_slots_manage_scope on public.blocked_slots for all
using (public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id))
with check (public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id));

drop policy if exists appointments_select_scope on public.appointments;
drop policy if exists appointments_client_insert_own on public.appointments;
drop policy if exists appointments_update_scope on public.appointments;
create policy appointments_select_scope on public.appointments for select using (
  client_id = auth.uid()
  or public.can_manage_barbershop(barbershop_id)
  or public.is_barber_profile(barber_id)
);
create policy appointments_client_insert_own on public.appointments for insert with check (
  client_id = auth.uid()
  and exists (
    select 1 from public.customers c
    where c.id = customer_id
      and c.barbershop_id = appointments.barbershop_id
      and c.profile_id = auth.uid()
  )
);
create policy appointments_staff_update on public.appointments for update
using (public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id))
with check (public.can_manage_barbershop(barbershop_id) or public.is_barber_profile(barber_id));

drop policy if exists appointment_events_select_scope on public.appointment_events;
drop policy if exists appointment_events_insert_authenticated on public.appointment_events;
create policy appointment_events_select_scope on public.appointment_events for select using (
  public.can_manage_barbershop(barbershop_id)
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and a.barbershop_id = appointment_events.barbershop_id
      and (a.client_id = auth.uid() or public.is_barber_profile(a.barber_id))
  )
);
create policy appointment_events_insert_scope on public.appointment_events for insert with check (
  public.can_manage_barbershop(barbershop_id)
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and a.barbershop_id = appointment_events.barbershop_id
      and (a.client_id = auth.uid() or public.is_barber_profile(a.barber_id))
  )
);

drop policy if exists presencial_payments_select_scope on public.presencial_payments;
drop policy if exists presencial_payments_admin_or_barber_all on public.presencial_payments;
create policy presencial_payments_select_scope on public.presencial_payments for select using (
  public.can_manage_barbershop(barbershop_id)
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and a.barbershop_id = presencial_payments.barbershop_id
      and (a.client_id = auth.uid() or public.is_barber_profile(a.barber_id))
  )
);
create policy presencial_payments_manage_scope on public.presencial_payments for all
using (
  public.can_manage_barbershop(barbershop_id)
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id and public.is_barber_profile(a.barber_id)
  )
)
with check (
  public.can_manage_barbershop(barbershop_id)
  or exists (
    select 1 from public.appointments a
    where a.id = appointment_id and public.is_barber_profile(a.barber_id)
  )
);

drop policy if exists business_settings_public_read on public.business_settings;
drop policy if exists business_settings_admin_all on public.business_settings;
create policy business_settings_public_read on public.business_settings for select using (true);
create policy business_settings_manage_tenant on public.business_settings for all
using (public.can_manage_barbershop(barbershop_id))
with check (public.can_manage_barbershop(barbershop_id));

create policy plans_public_read on public.plans for select using (is_active = true or public.is_platform_admin());
create policy plans_platform_manage on public.plans for all
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy subscriptions_manager_read on public.subscriptions for select using (
  public.can_manage_barbershop(barbershop_id)
);
create policy subscriptions_platform_manage on public.subscriptions for all
using (public.is_platform_admin()) with check (public.is_platform_admin());

grant select on public.organizations, public.barbershops, public.plans to anon, authenticated;
grant select on public.barbershop_members, public.customers, public.subscriptions to authenticated;
grant insert, update on public.customers to authenticated;
grant insert, update, delete on public.services, public.barbers, public.barber_services, public.business_hours, public.blocked_slots, public.business_settings to authenticated;
grant select on public.appointment_busy_slots, public.blocked_busy_slots to anon, authenticated;
revoke update on public.appointments from authenticated;
grant update on public.appointments to authenticated;

commit;

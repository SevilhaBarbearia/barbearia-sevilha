-- 009_saas_multitenant.sql
-- Eu transformo a instalação existente em SaaS sem apagar os dados da Sevilha.

begin;

do $$ begin
  create type public.membership_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  logo_url text,
  cover_url text,
  primary_color text not null default '#d4a74a' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#18181b' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone text not null default 'America/Fortaleza',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbershop_members (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, profile_id)
);

insert into public.organizations (name)
select 'Sevilha Barbearia'
where not exists (select 1 from public.organizations);

insert into public.barbershops (organization_id, name, slug)
select id, 'Sevilha Barbearia', 'sevilha'
from public.organizations
where not exists (select 1 from public.barbershops where slug = 'sevilha')
order by created_at
limit 1;

insert into public.barbershop_members (barbershop_id, profile_id, role)
select b.id, p.id, 'owner'
from public.barbershops b
join public.profiles p on p.role = 'admin' and p.is_active = true
where b.slug = 'sevilha'
on conflict (barbershop_id, profile_id) do update set role = 'owner', is_active = true;

update public.organizations o
set owner_profile_id = (
  select m.profile_id
  from public.barbershop_members m
  join public.barbershops b on b.id = m.barbershop_id
  where b.organization_id = o.id and m.role = 'owner'
  order by m.created_at
  limit 1
)
where o.owner_profile_id is null;

-- Eu mantenho profiles como identidade global e registro o relacionamento comercial por barbearia aqui.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  allow_email boolean not null default true,
  allow_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, profile_id),
  constraint customers_phone_check check (phone is null or phone ~ '^\d{10,13}$')
);

alter table public.services add column if not exists barbershop_id uuid;
alter table public.barbers add column if not exists barbershop_id uuid;
alter table public.barber_services add column if not exists barbershop_id uuid;
alter table public.business_hours add column if not exists barbershop_id uuid;
alter table public.blocked_slots add column if not exists barbershop_id uuid;
alter table public.appointments add column if not exists barbershop_id uuid;
alter table public.appointments add column if not exists customer_id uuid;
alter table public.appointment_events add column if not exists barbershop_id uuid;
alter table public.presencial_payments add column if not exists barbershop_id uuid;
alter table public.business_settings add column if not exists barbershop_id uuid;

update public.services set barbershop_id = (select id from public.barbershops where slug = 'sevilha') where barbershop_id is null;
update public.barbers set barbershop_id = (select id from public.barbershops where slug = 'sevilha') where barbershop_id is null;
update public.barber_services bs set barbershop_id = b.barbershop_id from public.barbers b where bs.barber_id = b.id and bs.barbershop_id is null;
update public.business_hours bh set barbershop_id = b.barbershop_id from public.barbers b where bh.barber_id = b.id and bh.barbershop_id is null;
update public.blocked_slots bs set barbershop_id = b.barbershop_id from public.barbers b where bs.barber_id = b.id and bs.barbershop_id is null;
update public.appointments a set barbershop_id = b.barbershop_id from public.barbers b where a.barber_id = b.id and a.barbershop_id is null;
update public.appointment_events ae set barbershop_id = a.barbershop_id from public.appointments a where ae.appointment_id = a.id and ae.barbershop_id is null;
update public.presencial_payments pp set barbershop_id = a.barbershop_id from public.appointments a where pp.appointment_id = a.id and pp.barbershop_id is null;
update public.business_settings set barbershop_id = (select id from public.barbershops where slug = 'sevilha') where barbershop_id is null;

insert into public.customers (barbershop_id, profile_id, full_name, email, phone)
select distinct a.barbershop_id, p.id, coalesce(p.full_name, p.email, 'Cliente'), p.email, p.phone
from public.appointments a
join public.profiles p on p.id = a.client_id
where a.barbershop_id is not null
on conflict (barbershop_id, profile_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  updated_at = now();

update public.appointments a
set customer_id = c.id
from public.customers c
where c.barbershop_id = a.barbershop_id
  and c.profile_id = a.client_id
  and a.customer_id is null;

alter table public.services alter column barbershop_id set not null;
alter table public.barbers alter column barbershop_id set not null;
alter table public.barber_services alter column barbershop_id set not null;
alter table public.business_hours alter column barbershop_id set not null;
alter table public.blocked_slots alter column barbershop_id set not null;
alter table public.appointments alter column barbershop_id set not null;
alter table public.appointments alter column customer_id set not null;
alter table public.appointment_events alter column barbershop_id set not null;
alter table public.presencial_payments alter column barbershop_id set not null;
alter table public.business_settings alter column barbershop_id set not null;

alter table public.services add constraint services_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.barbers add constraint barbers_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.barber_services add constraint barber_services_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.business_hours add constraint business_hours_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.blocked_slots add constraint blocked_slots_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.appointments add constraint appointments_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.appointments add constraint appointments_customer_fk foreign key (customer_id) references public.customers(id) on delete restrict;
alter table public.appointment_events add constraint appointment_events_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.presencial_payments add constraint presencial_payments_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;
alter table public.business_settings add constraint business_settings_barbershop_fk foreign key (barbershop_id) references public.barbershops(id) on delete cascade;

alter table public.services add constraint services_id_barbershop_unique unique (id, barbershop_id);
alter table public.barbers add constraint barbers_id_barbershop_unique unique (id, barbershop_id);
alter table public.customers add constraint customers_id_barbershop_unique unique (id, barbershop_id);
alter table public.appointments add constraint appointments_id_barbershop_unique unique (id, barbershop_id);

alter table public.barber_services add constraint barber_services_barber_tenant_fk
  foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete cascade;
alter table public.barber_services add constraint barber_services_service_tenant_fk
  foreign key (service_id, barbershop_id) references public.services(id, barbershop_id) on delete cascade;
alter table public.business_hours add constraint business_hours_barber_tenant_fk
  foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete cascade;
alter table public.blocked_slots add constraint blocked_slots_barber_tenant_fk
  foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete cascade;
alter table public.appointments add constraint appointments_barber_tenant_fk
  foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete restrict;
alter table public.appointments add constraint appointments_service_tenant_fk
  foreign key (service_id, barbershop_id) references public.services(id, barbershop_id) on delete restrict;
alter table public.appointments add constraint appointments_customer_tenant_fk
  foreign key (customer_id, barbershop_id) references public.customers(id, barbershop_id) on delete restrict;
alter table public.appointment_events add constraint appointment_events_appointment_tenant_fk
  foreign key (appointment_id, barbershop_id) references public.appointments(id, barbershop_id) on delete cascade;
alter table public.presencial_payments add constraint presencial_payments_appointment_tenant_fk
  foreign key (appointment_id, barbershop_id) references public.appointments(id, barbershop_id) on delete cascade;

alter table public.business_settings
  add constraint business_settings_one_per_barbershop unique (barbershop_id);

alter table public.business_settings
  add column if not exists email text,
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_professionals integer,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null unique references public.barbershops(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (code, name, max_professionals, features) values
  ('starter', 'Inicial', 3, '{"email": true, "loyalty": true, "feedback": true}'::jsonb),
  ('professional', 'Profissional', 10, '{"email": true, "whatsapp": true, "loyalty": true, "feedback": true, "advanced_reports": true}'::jsonb),
  ('premium', 'Premium', null, '{"email": true, "whatsapp": true, "loyalty": true, "feedback": true, "advanced_reports": true, "custom_domain": true}'::jsonb)
on conflict (code) do nothing;

insert into public.subscriptions (barbershop_id, plan_id, status, trial_ends_at)
select b.id, p.id, 'trial', now() + interval '30 days'
from public.barbershops b
join public.plans p on p.code = 'starter'
where b.slug = 'sevilha'
on conflict (barbershop_id) do nothing;

create index if not exists services_barbershop_idx on public.services(barbershop_id, is_active);
create index if not exists barbers_barbershop_idx on public.barbers(barbershop_id, is_active);
create index if not exists customers_barbershop_idx on public.customers(barbershop_id, full_name);
create index if not exists appointments_barbershop_start_idx on public.appointments(barbershop_id, start_at);
create index if not exists members_profile_idx on public.barbershop_members(profile_id, is_active);

drop view if exists public.appointment_busy_slots;
create view public.appointment_busy_slots as
select barbershop_id, barber_id, start_at, end_at
from public.appointments
where status in ('pending', 'confirmed');

drop view if exists public.blocked_busy_slots;
create view public.blocked_busy_slots as
select barbershop_id, barber_id, start_at, end_at
from public.blocked_slots;

create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_barbershops_updated_at before update on public.barbershops for each row execute function public.set_updated_at();
create trigger set_barbershop_members_updated_at before update on public.barbershop_members for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

commit;

-- 001_schema.sql
-- Estrutura principal do banco para Sevilha Barbearia.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.profile_role as enum ('client', 'admin', 'barber');
create type public.auth_provider as enum ('google', 'phone', 'manual');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'canceled', 'no_show');
create type public.payment_method as enum ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro');
create type public.payment_status as enum ('pending', 'paid', 'canceled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role public.profile_role not null default 'client',
  provider public.auth_provider not null default 'google',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  is_active boolean not null default true,
  constraint profiles_phone_check check (phone is null or phone ~ '^\d{10,13}$')
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  bio text,
  photo_url text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.barber_services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (barber_id, service_id)
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_valid_period check (end_time > start_time),
  constraint business_hours_valid_break check ((break_start is null and break_end is null) or (break_end > break_start))
);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocked_slots_valid_period check (end_at > start_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  total_price numeric(10,2) not null check (total_price >= 0),
  client_notes text,
  admin_notes text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  canceled_at timestamptz,
  completed_at timestamptz,
  constraint appointments_valid_period check (end_at > start_at),
  constraint appointments_not_past_on_insert check (start_at > created_at - interval '1 minute')
);

-- Regra forte contra conflito: dois agendamentos ativos não podem cruzar horário para o mesmo barbeiro.
alter table public.appointments
add constraint appointments_no_overlap_active
exclude using gist (
  barber_id with =,
  tstzrange(start_at, end_at, '[)') with &&
)
where (status in ('pending', 'confirmed'));

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.presencial_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  received_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Sevilha Barbearia',
  address text,
  phone text,
  whatsapp text,
  instagram text,
  cancellation_limit_hours integer not null default 4 check (cancellation_limit_hours >= 0),
  booking_advance_days integer not null default 30 check (booking_advance_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_barbers_updated_at before update on public.barbers for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_business_hours_updated_at before update on public.business_hours for each row execute function public.set_updated_at();
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger set_presencial_payments_updated_at before update on public.presencial_payments for each row execute function public.set_updated_at();
create trigger set_business_settings_updated_at before update on public.business_settings for each row execute function public.set_updated_at();

create index appointments_client_id_idx on public.appointments(client_id);
create index appointments_barber_start_idx on public.appointments(barber_id, start_at);
create index appointment_events_appointment_idx on public.appointment_events(appointment_id);
create index presencial_payments_status_idx on public.presencial_payments(status, paid_at);

-- View pública segura: mostra apenas horários ocupados, sem dados de cliente.
create or replace view public.appointment_busy_slots as
select barber_id, start_at, end_at
from public.appointments
where status in ('pending', 'confirmed');

-- View pública segura: mostra apenas bloqueios, sem motivo interno.
create or replace view public.blocked_busy_slots as
select barber_id, start_at, end_at
from public.blocked_slots;

insert into public.business_settings (business_name, cancellation_limit_hours, booking_advance_days)
values ('Sevilha Barbearia', 4, 30)
on conflict do nothing;

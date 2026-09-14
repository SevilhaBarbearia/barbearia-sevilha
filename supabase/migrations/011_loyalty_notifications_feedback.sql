-- 011_loyalty_notifications_feedback.sql
-- Eu mantenho fidelidade, comunicações e avaliações isoladas por barbearia.

begin;

do $$ begin
  create type public.loyalty_earning_mode as enum ('visit', 'amount', 'service');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.loyalty_transaction_type as enum ('earned', 'redeemed', 'adjustment', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reward_type as enum ('free_service', 'fixed_discount', 'percentage_discount', 'gift', 'custom');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('email', 'whatsapp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'processing', 'sent', 'failed', 'canceled');
exception when duplicate_object then null;
end $$;

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null unique references public.barbershops(id) on delete cascade,
  name text not null default 'Programa de fidelidade',
  earning_mode public.loyalty_earning_mode not null default 'visit',
  points_per_visit integer not null default 1 check (points_per_visit >= 0),
  points_per_currency numeric(10,4) not null default 1 check (points_per_currency >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loyalty_service_rules (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  loyalty_program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  points_earned integer not null check (points_earned >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loyalty_program_id, service_id),
  foreign key (service_id, barbershop_id) references public.services(id, barbershop_id) on delete cascade
);

create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  loyalty_program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  name text not null,
  reward_type public.reward_type not null default 'custom',
  service_id uuid references public.services(id) on delete set null,
  points_cost integer not null check (points_cost > 0),
  discount_value numeric(10,2) check (discount_value is null or discount_value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (service_id, barbershop_id) references public.services(id, barbershop_id)
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  current_points integer not null default 0 check (current_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, customer_id),
  foreign key (customer_id, barbershop_id) references public.customers(id, barbershop_id) on delete cascade
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  type public.loyalty_transaction_type not null,
  points integer not null check (points <> 0),
  description text not null,
  idempotency_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (customer_id, barbershop_id) references public.customers(id, barbershop_id) on delete cascade,
  foreign key (appointment_id, barbershop_id) references public.appointments(id, barbershop_id)
);

create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null unique references public.barbershops(id) on delete cascade,
  birthday_enabled boolean not null default false,
  birthday_channel public.notification_channel not null default 'email',
  birthday_send_time time not null default '09:00',
  satisfaction_enabled boolean not null default true,
  satisfaction_channel public.notification_channel not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  type text not null check (type in ('birthday', 'appointment_confirmation', 'appointment_reminder', 'satisfaction_survey', 'loyalty_reward')),
  channel public.notification_channel not null,
  subject text,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, type, channel)
);

create table public.outbound_notifications (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  type text not null,
  channel public.notification_channel not null,
  recipient text not null,
  subject text,
  content text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  provider text,
  provider_message_id text,
  error_message text,
  attempts integer not null default 0,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_feedback (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  token_hash bytea not null unique,
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  foreign key (appointment_id, barbershop_id) references public.appointments(id, barbershop_id) on delete cascade,
  foreign key (customer_id, barbershop_id) references public.customers(id, barbershop_id) on delete cascade,
  foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete cascade
);

create index loyalty_transactions_customer_idx on public.loyalty_transactions(barbershop_id, customer_id, created_at desc);
create index outbound_notifications_queue_idx on public.outbound_notifications(status, scheduled_at);
create index feedback_barber_date_idx on public.appointment_feedback(barbershop_id, barber_id, submitted_at);
create index customers_birthday_idx on public.customers(barbershop_id, (extract(month from birth_date)), (extract(day from birth_date)));

create trigger set_loyalty_programs_updated_at before update on public.loyalty_programs for each row execute function public.set_updated_at();
create trigger set_loyalty_service_rules_updated_at before update on public.loyalty_service_rules for each row execute function public.set_updated_at();
create trigger set_loyalty_rewards_updated_at before update on public.loyalty_rewards for each row execute function public.set_updated_at();
create trigger set_loyalty_accounts_updated_at before update on public.loyalty_accounts for each row execute function public.set_updated_at();
create trigger set_notification_settings_updated_at before update on public.notification_settings for each row execute function public.set_updated_at();
create trigger set_message_templates_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
create trigger set_outbound_notifications_updated_at before update on public.outbound_notifications for each row execute function public.set_updated_at();

insert into public.loyalty_programs (barbershop_id, name)
select id, 'Clube ' || name from public.barbershops on conflict (barbershop_id) do nothing;

insert into public.notification_settings (barbershop_id)
select id from public.barbershops on conflict (barbershop_id) do nothing;

insert into public.message_templates (barbershop_id, type, channel, subject, content)
select id, 'birthday', 'email', 'Feliz aniversário, {{nome}}!',
  'Parabéns, {{nome}}! A equipe da {{barbearia}} deseja um excelente aniversário.'
from public.barbershops on conflict (barbershop_id, type, channel) do nothing;

insert into public.message_templates (barbershop_id, type, channel, subject, content)
select id, 'satisfaction_survey', 'email', 'Como foi seu atendimento?',
  'Olá, {{nome}}! Conte como foi seu atendimento na {{barbearia}}: {{link_avaliacao}}'
from public.barbershops on conflict (barbershop_id, type, channel) do nothing;

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_service_rules enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.notification_settings enable row level security;
alter table public.message_templates enable row level security;
alter table public.outbound_notifications enable row level security;
alter table public.appointment_feedback enable row level security;

create policy loyalty_programs_read on public.loyalty_programs for select using (
  is_active or public.can_manage_barbershop(barbershop_id) or public.is_barbershop_member(barbershop_id)
);
create policy loyalty_programs_manage on public.loyalty_programs for all
using (public.can_manage_barbershop(barbershop_id)) with check (public.can_manage_barbershop(barbershop_id));
create policy loyalty_service_rules_read on public.loyalty_service_rules for select using (
  is_active or public.can_manage_barbershop(barbershop_id) or public.is_barbershop_member(barbershop_id)
);
create policy loyalty_service_rules_manage on public.loyalty_service_rules for all
using (public.can_manage_barbershop(barbershop_id)) with check (public.can_manage_barbershop(barbershop_id));
create policy loyalty_rewards_read on public.loyalty_rewards for select using (
  is_active or public.can_manage_barbershop(barbershop_id) or public.is_barbershop_member(barbershop_id)
);
create policy loyalty_rewards_manage on public.loyalty_rewards for all
using (public.can_manage_barbershop(barbershop_id)) with check (public.can_manage_barbershop(barbershop_id));

create policy loyalty_accounts_scope on public.loyalty_accounts for select using (
  public.can_manage_barbershop(barbershop_id)
  or exists (select 1 from public.customers c where c.id = customer_id and c.profile_id = auth.uid())
);
create policy loyalty_transactions_scope on public.loyalty_transactions for select using (
  public.can_manage_barbershop(barbershop_id)
  or exists (select 1 from public.customers c where c.id = customer_id and c.profile_id = auth.uid())
);

create policy notification_settings_manage on public.notification_settings for all
using (public.can_manage_barbershop(barbershop_id)) with check (public.can_manage_barbershop(barbershop_id));
create policy message_templates_manage on public.message_templates for all
using (public.can_manage_barbershop(barbershop_id)) with check (public.can_manage_barbershop(barbershop_id));
create policy outbound_notifications_manager_read on public.outbound_notifications for select using (
  public.can_manage_barbershop(barbershop_id)
);
create policy feedback_manager_read on public.appointment_feedback for select using (
  public.can_manage_barbershop(barbershop_id)
  or exists (select 1 from public.customers c where c.id = customer_id and c.profile_id = auth.uid())
);

grant select on public.loyalty_programs, public.loyalty_service_rules, public.loyalty_rewards to anon, authenticated;
grant select on public.loyalty_accounts, public.loyalty_transactions, public.appointment_feedback to authenticated;
grant select, insert, update, delete on public.notification_settings, public.message_templates, public.loyalty_programs, public.loyalty_service_rules, public.loyalty_rewards to authenticated;
grant select on public.outbound_notifications to authenticated;

commit;

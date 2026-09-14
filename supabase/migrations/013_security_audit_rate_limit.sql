-- 013_security_audit_rate_limit.sql
-- Eu registro mudanças administrativas e limito operações públicas sensíveis no próprio banco.

begin;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  barbershop_id uuid references public.barbershops(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  attempts integer not null default 1,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audit_logs_tenant_date_idx on public.audit_logs(barbershop_id, created_at desc);

create or replace function public.audit_tenant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_id uuid;
  record_id text;
begin
  tenant_id := coalesce((to_jsonb(new) ->> 'barbershop_id')::uuid, (to_jsonb(old) ->> 'barbershop_id')::uuid);
  record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');

  insert into public.audit_logs (barbershop_id, actor_id, entity_type, entity_id, action, old_data, new_data)
  values (
    tenant_id,
    auth.uid(),
    tg_table_name,
    record_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger audit_services after insert or update or delete on public.services for each row execute function public.audit_tenant_change();
create trigger audit_barbers after insert or update or delete on public.barbers for each row execute function public.audit_tenant_change();
create trigger audit_business_settings after insert or update or delete on public.business_settings for each row execute function public.audit_tenant_change();
create trigger audit_loyalty_programs after insert or update or delete on public.loyalty_programs for each row execute function public.audit_tenant_change();
create trigger audit_loyalty_rewards after insert or update or delete on public.loyalty_rewards for each row execute function public.audit_tenant_change();

alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

create policy audit_logs_manager_read on public.audit_logs for select using (
  barbershop_id is not null and public.can_manage_barbershop(barbershop_id)
);

grant select on public.audit_logs to authenticated;
revoke all on public.rate_limits from public, anon, authenticated;

commit;

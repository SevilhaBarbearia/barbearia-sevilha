-- 022_customer_appointment_overlap.sql
-- Eu impeço que o mesmo cliente tenha duas reservas ativas sobrepostas,
-- mesmo quando os agendamentos são com barbeiros diferentes.

begin;

-- Eu interrompo a migration com uma mensagem clara caso já existam conflitos
-- antigos. Assim nenhum agendamento é cancelado automaticamente.
do $$
begin
  if exists (
    select 1
    from public.appointments a1
    join public.appointments a2
      on a2.barbershop_id = a1.barbershop_id
     and a2.customer_id = a1.customer_id
     and a2.id > a1.id
     and a2.status in ('pending', 'confirmed')
     and a1.status in ('pending', 'confirmed')
     and tstzrange(a1.start_at, a1.end_at, '[)') &&
         tstzrange(a2.start_at, a2.end_at, '[)')
  ) then
    raise exception 'Existem clientes com reservas ativas sobrepostas. Resolva esses conflitos antes de aplicar a migration 022.';
  end if;
end;
$$;

-- Eu serializo alterações da agenda do mesmo cliente pela linha de customers.
-- Isso evita corrida entre duas abas ou dois pedidos simultâneos.
create or replace function public.prevent_customer_appointment_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  perform 1
  from public.customers
  where id = new.customer_id
    and barbershop_id = new.barbershop_id
  for update;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.barbershop_id = new.barbershop_id
      and a.customer_id = new.customer_id
      and a.status in ('pending', 'confirmed')
      and a.id is distinct from new.id
      and a.start_at < new.end_at
      and a.end_at > new.start_at
  ) then
    raise exception 'CUSTOMER_TIME_CONFLICT';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_customer_appointment_overlap
on public.appointments;

create trigger prevent_customer_appointment_overlap
before insert or update of
  barbershop_id,
  customer_id,
  start_at,
  end_at,
  status
on public.appointments
for each row
execute function public.prevent_customer_appointment_overlap();

-- Eu mantenho também uma proteção estrutural no PostgreSQL.
-- Mesmo que outra rotina seja criada no futuro, o banco continua impedindo
-- duas reservas ativas sobrepostas para o mesmo cliente na mesma barbearia.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_customer_overlap_active'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_customer_overlap_active
      exclude using gist (
        barbershop_id with =,
        customer_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      )
      where (status in ('pending', 'confirmed'));
  end if;
end;
$$;

create index if not exists appointments_customer_start_idx
  on public.appointments (
    barbershop_id,
    customer_id,
    start_at
  );

commit;
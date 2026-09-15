-- 028_structured_no_show.sql
--
-- Eu uso o status ENUM `no_show`, que já existe em appointment_status,
-- como classificação estruturada do não comparecimento.
--
-- Com isso eu consigo gerar relatórios futuros por:
--   barbershop_id + customer_id + status = 'no_show'
--
-- no_show_at e no_show_marked_by guardam quando e quem registrou a ausência.
-- cancellation_reason permanece apenas como descrição humana auxiliar.

begin;

alter table public.appointments
  add column if not exists no_show_at timestamptz,
  add column if not exists no_show_marked_by uuid
    references public.profiles(id)
    on delete set null;

-- Eu normalizo eventuais registros antigos que já utilizavam o status no_show.
update public.appointments
set
  no_show_at = coalesce(
    no_show_at,
    canceled_at,
    updated_at,
    created_at
  ),
  canceled_at = coalesce(
    canceled_at,
    updated_at,
    created_at
  ),
  cancellation_reason = coalesce(
    nullif(trim(cancellation_reason), ''),
    'Não compareceu (no-show).'
  )
where status = 'no_show';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_show_metadata_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_show_metadata_check
      check (
        status <> 'no_show'
        or no_show_at is not null
      );
  end if;
end;
$$;

create index if not exists appointments_no_show_report_idx
  on public.appointments (
    barbershop_id,
    customer_id,
    start_at desc
  )
  where status = 'no_show';


-- Cancelamento administrativo normal.
--
-- Eu mantenho esta operação separada do no-show para que o banco consiga
-- distinguir com precisão um cancelamento comum de uma ausência do cliente.
create or replace function public.cancel_appointment_by_manager(
  target_barbershop_id uuid,
  target_appointment_id uuid,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Primeira barreira: a sessão precisa administrar exatamente este tenant.
  if not public.can_manage_barbershop(
    target_barbershop_id
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Segunda barreira: mesmo conhecendo o UUID da reserva, ela precisa
  -- pertencer ao mesmo barbershop_id recebido pela função.
  select *
  into appointment_record
  from public.appointments
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if appointment_record.status
    not in ('pending', 'confirmed')
  then
    raise exception 'INVALID_STATUS';
  end if;

  update public.appointments
  set
    status = 'canceled',
    canceled_at = now(),
    cancellation_reason = coalesce(
      nullif(trim(reason), ''),
      'Cancelado pela barbearia.'
    ),
    no_show_at = null,
    no_show_marked_by = null,
    updated_at = now()
  where id = appointment_record.id
    and barbershop_id = target_barbershop_id;

  insert into public.appointment_events (
    barbershop_id,
    appointment_id,
    event_type,
    description,
    created_by
  )
  values (
    target_barbershop_id,
    appointment_record.id,
    'canceled_by_manager',
    coalesce(
      nullif(trim(reason), ''),
      'Cancelado pela barbearia.'
    ),
    auth.uid()
  );
end;
$$;

revoke all
on function public.cancel_appointment_by_manager(
  uuid,
  uuid,
  text
)
from public, anon;

grant execute
on function public.cancel_appointment_by_manager(
  uuid,
  uuid,
  text
)
to authenticated;


-- Não comparecimento estruturado.
create or replace function public.mark_appointment_no_show(
  target_barbershop_id uuid,
  target_appointment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Primeira barreira de isolamento multi-tenant.
  if not public.can_manage_barbershop(
    target_barbershop_id
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Segunda barreira de isolamento multi-tenant.
  select *
  into appointment_record
  from public.appointments
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if appointment_record.status
    not in ('pending', 'confirmed')
  then
    raise exception 'INVALID_STATUS';
  end if;

  -- Eu não permito registrar ausência antes do início do horário.
  if appointment_record.start_at > now() then
    raise exception 'APPOINTMENT_NOT_STARTED';
  end if;

  update public.appointments
  set
    status = 'no_show',
    canceled_at = now(),
    cancellation_reason = 'Não compareceu (no-show).',
    no_show_at = now(),
    no_show_marked_by = auth.uid(),
    updated_at = now()
  where id = appointment_record.id
    and barbershop_id = target_barbershop_id;

  insert into public.appointment_events (
    barbershop_id,
    appointment_id,
    event_type,
    description,
    created_by
  )
  values (
    target_barbershop_id,
    appointment_record.id,
    'no_show',
    'Cliente não compareceu. Reserva marcada como no-show.',
    auth.uid()
  );
end;
$$;

revoke all
on function public.mark_appointment_no_show(
  uuid,
  uuid
)
from public, anon;

grant execute
on function public.mark_appointment_no_show(
  uuid,
  uuid
)
to authenticated;

commit;

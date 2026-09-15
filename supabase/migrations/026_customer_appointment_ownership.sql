-- 026_customer_appointment_ownership.sql
--
-- Eu deixo de depender exclusivamente de appointments.client_id
-- para determinar se um agendamento pertence ao cliente.
--
-- Para reservas sem conta, eu aceito como propriedade do usuário
-- autenticado somente quando o e-mail da reserva é igual ao e-mail
-- assinado no JWT do Supabase.
--
-- Eu NÃO faço associação automática somente por telefone porque o
-- telefone do perfil ainda não é uma identidade verificada. Isso
-- evitaria que alguém informasse o telefone de outra pessoa e
-- acessasse reservas alheias.

begin;

create or replace function public.is_customer_identity_owner(
  target_customer_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.customers c
      where c.id = target_customer_id
        and (
          c.profile_id = auth.uid()

          or (
            c.profile_id is null
            and c.email is not null

            and nullif(
              lower(
                trim(
                  auth.jwt() ->> 'email'
                )
              ),
              ''
            ) is not null

            and lower(
              trim(c.email)
            ) =
              lower(
                trim(
                  auth.jwt() ->> 'email'
                )
              )
          )
        )
    );
$$;

revoke all
on function public.is_customer_identity_owner(uuid)
from public, anon;

grant execute
on function public.is_customer_identity_owner(uuid)
to authenticated;


create or replace function public.is_appointment_identity_owner(
  target_appointment_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.appointments a
      where a.id = target_appointment_id

        and (
          a.client_id = auth.uid()

          or public.is_customer_identity_owner(
            a.customer_id
          )
        )
    );
$$;

revoke all
on function public.is_appointment_identity_owner(uuid)
from public, anon;

grant execute
on function public.is_appointment_identity_owner(uuid)
to authenticated;


-- O cliente consegue consultar:
-- 1. o customer diretamente ligado ao profile;
-- 2. ou um customer guest cujo e-mail seja o mesmo da identidade
--    autenticada.
drop policy if exists customers_select_scope
on public.customers;

create policy customers_select_scope
on public.customers
for select
using (
  public.is_customer_identity_owner(id)

  or public.can_manage_barbershop(
    barbershop_id
  )
);


-- A reserva não depende mais exclusivamente de client_id.
drop policy if exists appointments_select_scope
on public.appointments;

create policy appointments_select_scope
on public.appointments
for select
using (
  public.is_appointment_identity_owner(id)

  or public.can_manage_barbershop(
    barbershop_id
  )

  or public.is_barber_profile(
    barber_id
  )
);


-- Eventos seguem a mesma identidade do agendamento.
drop policy if exists appointment_events_select_scope
on public.appointment_events;

create policy appointment_events_select_scope
on public.appointment_events
for select
using (
  public.can_manage_barbershop(
    barbershop_id
  )

  or public.is_appointment_identity_owner(
    appointment_id
  )

  or exists (
    select 1
    from public.appointments a
    where a.id = appointment_id
      and a.barbershop_id =
        appointment_events.barbershop_id
      and public.is_barber_profile(
        a.barber_id
      )
  )
);


-- Pagamentos também podem ser vistos pelo verdadeiro proprietário
-- da reserva, além dos administradores/barbeiros autorizados.
drop policy if exists presencial_payments_select_scope
on public.presencial_payments;

create policy presencial_payments_select_scope
on public.presencial_payments
for select
using (
  public.can_manage_barbershop(
    barbershop_id
  )

  or public.is_appointment_identity_owner(
    appointment_id
  )

  or exists (
    select 1
    from public.appointments a
    where a.id = appointment_id
      and a.barbershop_id =
        presencial_payments.barbershop_id
      and public.is_barber_profile(
        a.barber_id
      )
  )
);


-- Quando o cliente autenticado entra em "Meus agendamentos",
-- esta função pode transformar reservas guest compatíveis em
-- reservas também vinculadas ao UUID autenticado.
--
-- Isso é idempotente: depois da primeira execução não altera
-- novamente as mesmas reservas.
create or replace function public.claim_my_guest_appointments(
  target_barbershop_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_email text;
  claimed_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.barbershops b
    where b.id = target_barbershop_id
      and b.is_active = true
  ) then
    raise exception 'BARBERSHOP_NOT_FOUND';
  end if;

  select
    nullif(
      lower(
        trim(u.email)
      ),
      ''
    )
  into authenticated_email
  from auth.users u
  where u.id = auth.uid();

  -- Sem e-mail autenticado eu não faço associação automática.
  if authenticated_email is null then
    return 0;
  end if;

  update public.appointments a
  set
    client_id = auth.uid(),
    updated_at = now()

  where a.barbershop_id =
      target_barbershop_id

    and a.client_id is null

    and exists (
      select 1
      from public.customers c
      where c.id = a.customer_id
        and c.barbershop_id =
          a.barbershop_id
        and c.profile_id is null
        and c.email is not null
        and lower(
          trim(c.email)
        ) =
          authenticated_email
    );

  get diagnostics
    claimed_count = row_count;

  return claimed_count;
end;
$$;

revoke all
on function public.claim_my_guest_appointments(uuid)
from public, anon;

grant execute
on function public.claim_my_guest_appointments(uuid)
to authenticated;


-- O cancelamento precisa utilizar a mesma regra de propriedade.
create or replace function public.cancel_my_appointment(
  target_appointment_id uuid,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record
    public.appointments%rowtype;

  selected_settings
    public.business_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into appointment_record
  from public.appointments

  where id =
    target_appointment_id

    and public.is_appointment_identity_owner(
      id
    )

  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if appointment_record.status
    not in (
      'pending',
      'confirmed'
    )
  then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into selected_settings
  from public.business_settings

  where barbershop_id =
    appointment_record.barbershop_id;

  if appointment_record.start_at
    <
      now()
      +
      make_interval(
        hours =>
          coalesce(
            selected_settings
              .cancellation_limit_hours,
            4
          )
      )
  then
    raise exception 'CANCELLATION_LIMIT';
  end if;

  update public.appointments
  set
    status = 'canceled',
    canceled_at = now(),
    cancellation_reason =
      nullif(
        trim(reason),
        ''
      ),
    updated_at = now()

  where id =
    appointment_record.id;

  insert into public.appointment_events (
    barbershop_id,
    appointment_id,
    event_type,
    description,
    created_by
  )
  values (
    appointment_record.barbershop_id,
    appointment_record.id,
    'canceled',

    coalesce(
      nullif(
        trim(reason),
        ''
      ),
      'Cancelado pelo cliente.'
    ),

    auth.uid()
  );
end;
$$;

revoke all
on function public.cancel_my_appointment(
  uuid,
  text
)
from public, anon;

grant execute
on function public.cancel_my_appointment(
  uuid,
  text
)
to authenticated;

commit;
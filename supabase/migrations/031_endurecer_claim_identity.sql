-- 031_endurecer_claim_identity.sql
--
-- Exige e-mail confirmado no Auth para reivindicar reserva guest.
-- Fecha o vetor residual do 030: conta nova com e-mail de outra pessoa
-- nao consegue mais claim do historico dela sem confirmar o e-mail.

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
            and exists (
              select 1 from auth.users u
              where u.id = auth.uid()
                and u.email_confirmed_at is not null
            )
            and nullif(lower(trim(auth.jwt() ->> 'email')), '') is not null
            and lower(trim(c.email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    );
$$;

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
    select 1 from public.barbershops b
    where b.id = target_barbershop_id and b.is_active = true
  ) then
    raise exception 'BARBERSHOP_NOT_FOUND';
  end if;

  select nullif(lower(trim(u.email)), '')
  into authenticated_email
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;

  if authenticated_email is null then
    return 0;
  end if;

  update public.appointments a
  set client_id = auth.uid(), updated_at = now()
  where a.barbershop_id = target_barbershop_id
    and a.client_id is null
    and exists (
      select 1 from public.customers c
      where c.id = a.customer_id
        and c.barbershop_id = a.barbershop_id
        and c.profile_id is null
        and c.email is not null
        and lower(trim(c.email)) = authenticated_email
    );

  get diagnostics claimed_count = row_count;
  return claimed_count;
end;
$$;

commit;

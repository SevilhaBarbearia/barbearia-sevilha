-- release_readiness.sql
-- SOMENTE LEITURA.
-- Eu uso este arquivo depois das migrations para confirmar funções,
-- políticas e integridade multi-tenant sem alterar nenhum dado.

-- 1. Objetos críticos esperados.
select
  'book_guest_appointment' as check_name,
  to_regprocedure(
    'public.book_guest_appointment(uuid,uuid,uuid,timestamptz,text,text,text,text)'
  ) is not null as ok

union all

select
  'complete_appointment_with_payment',
  to_regprocedure(
    'public.complete_appointment_with_payment(uuid,uuid,numeric,public.payment_method)'
  ) is not null

union all

select
  'claim_my_guest_appointments',
  to_regprocedure(
    'public.claim_my_guest_appointments(uuid)'
  ) is not null

union all

select
  'cancel_my_appointment',
  to_regprocedure(
    'public.cancel_my_appointment(uuid,text)'
  ) is not null;


-- 2. Trigger de alinhamento da grade.
select
  'slot_alignment_trigger' as check_name,
  exists (
    select 1
    from pg_trigger
    where tgname =
      'enforce_appointment_slot_alignment'
      and not tgisinternal
  ) as ok;


-- 3. Policies críticas.
select
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and (
    (
      tablename = 'appointments'
      and policyname =
        'appointments_select_scope'
    )
    or (
      tablename = 'customers'
      and policyname =
        'customers_select_scope'
    )
  )
order by
  tablename,
  policyname;


-- 4. Nenhuma reserva pode apontar para entidade de outro tenant.
select
  'appointment_customer_tenant_mismatch'
    as check_name,
  count(*) as violations
from public.appointments a
join public.customers c
  on c.id = a.customer_id
where c.barbershop_id <>
  a.barbershop_id

union all

select
  'appointment_barber_tenant_mismatch',
  count(*)
from public.appointments a
join public.barbers b
  on b.id = a.barber_id
where b.barbershop_id <>
  a.barbershop_id

union all

select
  'appointment_service_tenant_mismatch',
  count(*)
from public.appointments a
join public.services s
  on s.id = a.service_id
where s.barbershop_id <>
  a.barbershop_id

union all

select
  'payment_tenant_mismatch',
  count(*)
from public.presencial_payments p
join public.appointments a
  on a.id = p.appointment_id
where p.barbershop_id <>
  a.barbershop_id;


-- 5. Inventário para o canary de múltiplos tenants.
select
  b.id,
  b.slug,
  b.name,
  b.is_active,
  count(m.id) filter (
    where m.is_active
  ) as active_members
from public.barbershops b
left join public.barbershop_members m
  on m.barbershop_id =
    b.id
group by
  b.id,
  b.slug,
  b.name,
  b.is_active
order by
  b.created_at;

-- release_readiness.sql
-- SOMENTE LEITURA.
-- Eu uso este arquivo depois das migrations para confirmar funções,
-- políticas, rollout, no-show e integridade multi-tenant sem alterar nenhum dado.

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
  ) is not null

union all

select
  'cancel_appointment_by_manager',
  to_regprocedure(
    'public.cancel_appointment_by_manager(uuid,uuid,text)'
  ) is not null

union all

select
  'mark_appointment_no_show',
  to_regprocedure(
    'public.mark_appointment_no_show(uuid,uuid)'
  ) is not null

union all

select
  'check_current_app_session',
  to_regprocedure(
    'public.check_current_app_session()'
  ) is not null

union all

select
  'touch_current_app_session',
  to_regprocedure(
    'public.touch_current_app_session()'
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


-- 3. Rollout individual por tenant.
select
  'tenant_ui_version_column' as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'barbershops'
      and column_name = 'ui_version'
  ) as ok;


-- 4. Metadados estruturados de no-show.
select
  'appointments_no_show_at_column' as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'no_show_at'
  ) as ok

union all

select
  'appointments_no_show_marked_by_column',
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'no_show_marked_by'
  );


-- 5. Policies críticas.
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


-- 6. Nenhuma reserva pode apontar para entidade de outro tenant.
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
  a.barbershop_id

union all

select
  'no_show_without_metadata',
  count(*)
from public.appointments a
where a.status = 'no_show'
  and a.no_show_at is null;


-- 7. Inventário para o canary de múltiplos tenants.
select
  b.id,
  b.slug,
  b.name,
  b.is_active,
  b.ui_version,
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
  b.is_active,
  b.ui_version
order by
  b.created_at;

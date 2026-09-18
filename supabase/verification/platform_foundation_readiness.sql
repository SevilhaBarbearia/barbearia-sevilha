-- platform_foundation_readiness.sql
-- SOMENTE LEITURA.
-- Valida a fundação do Platform Admin sem alterar dados.

-- 1. Tabelas e RLS.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'platform_features',
    'plan_features',
    'barbershop_feature_overrides',
    'platform_audit_logs',
    'platform_support_sessions'
  )
order by c.relname;

-- Todos devem retornar rls_enabled = true.

-- 2. can_manage_barbershop não pode mais conter is_platform_admin.
select
  position(
    'is_platform_admin'
    in pg_get_functiondef(
      'public.can_manage_barbershop(uuid)'::regprocedure
    )
  ) = 0
  as platform_admin_removed_from_can_manage;

-- Esperado: true.

-- 3. Objetos críticos.
select
  'platform_open_support_session' as check_name,
  to_regprocedure(
    'public.platform_open_support_session(uuid,text,text,text[],integer)'
  ) is not null as ok

union all

select
  'platform_close_support_session',
  to_regprocedure(
    'public.platform_close_support_session(uuid,text)'
  ) is not null

union all

select
  'platform_support_list_appointments',
  to_regprocedure(
    'public.platform_support_list_appointments(uuid,timestamptz,timestamptz)'
  ) is not null

union all

select
  'platform_support_get_customer_contact',
  to_regprocedure(
    'public.platform_support_get_customer_contact(uuid,uuid)'
  ) is not null

union all

select
  'platform_set_feature_override',
  to_regprocedure(
    'public.platform_set_feature_override(uuid,text,boolean,text)'
  ) is not null

union all

select
  'platform_change_subscription',
  to_regprocedure(
    'public.platform_change_subscription(uuid,uuid,public.subscription_status,text)'
  ) is not null

union all

select
  'platform_set_ui_version',
  to_regprocedure(
    'public.platform_set_ui_version(uuid,text,text)'
  ) is not null;

-- Todos devem retornar ok = true.

-- 4. Owner/manager não possui privilégio SQL direto de escrita na subscription.
select
  has_table_privilege(
    'authenticated',
    'public.subscriptions',
    'UPDATE'
  ) as authenticated_can_update_subscriptions,
  has_table_privilege(
    'authenticated',
    'public.subscriptions',
    'INSERT'
  ) as authenticated_can_insert_subscriptions,
  has_table_privilege(
    'authenticated',
    'public.subscriptions',
    'DELETE'
  ) as authenticated_can_delete_subscriptions;

-- Esperado: false | false | false.

-- 5. Catálogo de features.
select
  code,
  name,
  is_active
from public.platform_features
order by code;

-- 6. Trials existentes: somente inventário.
-- Esta consulta serve para confirmar visualmente que a migration não
-- reescreveu trial_ends_at de Sevilha/ExclusiveMen.
select
  b.slug,
  s.status,
  s.trial_started_at,
  s.trial_ends_at,
  s.created_at
from public.barbershops b
join public.subscriptions s
  on s.barbershop_id = b.id
order by b.created_at;

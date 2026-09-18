-- 029_platform_admin_foundation.sql
--
-- Fundação do Platform Admin.
--
-- Este bloco agrupa:
-- 1. modelo comercial e feature flags por tenant;
-- 2. separação real entre Platform Admin e owner/manager;
-- 3. RLS das estruturas de plataforma;
-- 4. auditoria de ações da plataforma;
-- 5. modo suporte temporário, escopado e auditado;
-- 6. trial de 15 dias SOMENTE para novos tenants.
--
-- IMPORTANTE:
-- Esta migration NÃO altera trial_ends_at de subscriptions já existentes.

-- O enum precisa receber o novo valor antes de ele ser utilizado em funções.
alter type public.subscription_status
  add value if not exists 'suspended';

begin;

-- ================================================================
-- 1. CICLO DE VIDA DO TENANT
-- ================================================================

alter table public.barbershops
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid
    references public.profiles(id)
    on delete set null,
  add column if not exists archive_reason text;

comment on column public.barbershops.archived_at is
  'Soft delete do tenant. O registro e os dados operacionais permanecem preservados.';

alter table public.subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists suspension_reason text,
  add column if not exists cancellation_reason text;

-- Eu preencho somente metadados ausentes.
-- trial_ends_at NÃO é alterado: Sevilha/ExclusiveMen mantêm o prazo já concedido.
update public.subscriptions
set
  trial_started_at = coalesce(trial_started_at, started_at, created_at),
  status_changed_at = coalesce(status_changed_at, updated_at, created_at)
where trial_started_at is null
   or status_changed_at is null;

-- ================================================================
-- 2. CATÁLOGO DE FEATURES / PLANO / OVERRIDE POR TENANT
-- ================================================================

create table if not exists public.platform_features (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  plan_id uuid not null
    references public.plans(id)
    on delete cascade,
  feature_id uuid not null
    references public.platform_features(id)
    on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, feature_id)
);

create table if not exists public.barbershop_feature_overrides (
  barbershop_id uuid not null
    references public.barbershops(id)
    on delete cascade,
  feature_id uuid not null
    references public.platform_features(id)
    on delete cascade,
  enabled boolean not null,
  reason text,
  updated_by uuid
    references public.profiles(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (barbershop_id, feature_id)
);

insert into public.platform_features (
  code,
  name,
  description
)
values
  (
    'loyalty',
    'Programa de fidelidade',
    'Permite pontos, recompensas e resgates.'
  ),
  (
    'birthday_notifications',
    'Notificações de aniversário',
    'Permite comunicação automática de aniversário.'
  ),
  (
    'satisfaction_survey',
    'Pesquisa de satisfação',
    'Permite solicitar avaliação após o atendimento.'
  ),
  (
    'email_notifications',
    'Notificações por e-mail',
    'Permite recursos que dependem de envio de e-mail.'
  ),
  (
    'whatsapp_notifications',
    'Notificações por WhatsApp',
    'Reserva o direito comercial a integrações via WhatsApp.'
  ),
  (
    'advanced_reports',
    'Relatórios avançados',
    'Permite relatórios avançados do tenant.'
  ),
  (
    'custom_domain',
    'Domínio personalizado',
    'Permite domínio próprio para o tenant.'
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- Eu migro o comportamento atual de plans.features para a estrutura normalizada.
-- Isso preserva os direitos dos planos atuais sem depender do JSON no futuro.
insert into public.plan_features (
  plan_id,
  feature_id,
  enabled
)
select
  p.id,
  f.id,
  case f.code
    when 'loyalty'
      then coalesce((p.features ->> 'loyalty')::boolean, false)
    when 'satisfaction_survey'
      then coalesce((p.features ->> 'feedback')::boolean, false)
    when 'birthday_notifications'
      then coalesce((p.features ->> 'email')::boolean, false)
    when 'email_notifications'
      then coalesce((p.features ->> 'email')::boolean, false)
    when 'whatsapp_notifications'
      then coalesce((p.features ->> 'whatsapp')::boolean, false)
    when 'advanced_reports'
      then coalesce((p.features ->> 'advanced_reports')::boolean, false)
    when 'custom_domain'
      then coalesce((p.features ->> 'custom_domain')::boolean, false)
    else false
  end
from public.plans p
cross join public.platform_features f
on conflict (plan_id, feature_id) do nothing;

-- ================================================================
-- 3. AUDITORIA EXCLUSIVA DA PLATAFORMA
-- ================================================================

create table if not exists public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid
    references public.profiles(id)
    on delete set null,
  actor_email_snapshot text,
  barbershop_id uuid
    references public.barbershops(id)
    on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  reason text,
  support_session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_tenant_date_idx
  on public.platform_audit_logs (
    barbershop_id,
    created_at desc
  );

create index if not exists platform_audit_logs_actor_date_idx
  on public.platform_audit_logs (
    actor_id,
    created_at desc
  );

-- ================================================================
-- 4. MODO SUPORTE TEMPORÁRIO
-- ================================================================

create table if not exists public.platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid not null
    references public.profiles(id)
    on delete cascade,
  barbershop_id uuid not null
    references public.barbershops(id)
    on delete cascade,
  reason text not null
    check (char_length(trim(reason)) between 5 and 500),
  ticket_reference text,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  closed_reason text,
  constraint platform_support_scopes_check
    check (
      cardinality(scopes) > 0
      and scopes <@ array[
        'schedule_read',
        'customer_summary_read',
        'customer_contact_read',
        'payment_read',
        'settings_read'
      ]::text[]
    ),
  constraint platform_support_expiration_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '30 minutes'
    )
);

create index if not exists platform_support_sessions_active_idx
  on public.platform_support_sessions (
    platform_admin_id,
    barbershop_id,
    expires_at
  )
  where closed_at is null;

-- ================================================================
-- 5. RLS DAS ESTRUTURAS DA PLATAFORMA
-- ================================================================

alter table public.platform_features enable row level security;
alter table public.plan_features enable row level security;
alter table public.barbershop_feature_overrides enable row level security;
alter table public.platform_audit_logs enable row level security;
alter table public.platform_support_sessions enable row level security;

revoke all on public.platform_features
  from public, anon, authenticated;
revoke all on public.plan_features
  from public, anon, authenticated;
revoke all on public.barbershop_feature_overrides
  from public, anon, authenticated;
revoke all on public.platform_audit_logs
  from public, anon, authenticated;
revoke all on public.platform_support_sessions
  from public, anon, authenticated;

grant select on public.platform_features to authenticated;
grant select on public.plan_features to authenticated;
grant select on public.barbershop_feature_overrides to authenticated;
grant select on public.platform_audit_logs to authenticated;
grant select on public.platform_support_sessions to authenticated;

drop policy if exists platform_features_platform_read
  on public.platform_features;
create policy platform_features_platform_read
  on public.platform_features
  for select
  using (public.is_platform_admin());

drop policy if exists plan_features_platform_read
  on public.plan_features;
create policy plan_features_platform_read
  on public.plan_features
  for select
  using (public.is_platform_admin());

drop policy if exists feature_overrides_platform_read
  on public.barbershop_feature_overrides;
create policy feature_overrides_platform_read
  on public.barbershop_feature_overrides
  for select
  using (public.is_platform_admin());

drop policy if exists platform_audit_logs_platform_read
  on public.platform_audit_logs;
create policy platform_audit_logs_platform_read
  on public.platform_audit_logs
  for select
  using (public.is_platform_admin());

drop policy if exists platform_support_sessions_platform_read
  on public.platform_support_sessions;
create policy platform_support_sessions_platform_read
  on public.platform_support_sessions
  for select
  using (
    public.is_platform_admin()
    and platform_admin_id = auth.uid()
  );

-- Subscription passa a ser dado comercial da plataforma.
-- Owner/manager não lê/escreve a tabela diretamente.
drop policy if exists subscriptions_manager_read
  on public.subscriptions;
drop policy if exists subscriptions_platform_manage
  on public.subscriptions;
drop policy if exists subscriptions_platform_read
  on public.subscriptions;

create policy subscriptions_platform_read
  on public.subscriptions
  for select
  using (public.is_platform_admin());

revoke insert, update, delete
  on public.subscriptions
  from public, anon, authenticated;

grant select
  on public.subscriptions
  to authenticated;

-- ================================================================
-- 6. SEPARAÇÃO REAL: PLATFORM ADMIN != TENANT ADMIN
-- ================================================================

create or replace function public.can_manage_barbershop(
  target_barbershop uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_password_session()
    and exists (
      select 1
      from public.barbershop_members m
      join public.profiles p
        on p.id = m.profile_id
      join public.barbershops b
        on b.id = m.barbershop_id
      where m.barbershop_id = target_barbershop
        and m.profile_id = auth.uid()
        and m.role in ('owner', 'manager')
        and m.is_active = true
        and p.is_active = true
        and b.is_active = true
        and b.archived_at is null
    );
$$;

-- Platform Admin também deixa de ter leitura global de profiles.
-- Owner/manager pode ler apenas perfis que também são membros do mesmo tenant.
drop policy if exists profiles_select_scope
  on public.profiles;

create policy profiles_select_scope
  on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.barbershop_members me
      join public.barbershop_members target_member
        on target_member.barbershop_id = me.barbershop_id
      where me.profile_id = auth.uid()
        and me.role in ('owner', 'manager')
        and me.is_active = true
        and target_member.profile_id = profiles.id
        and target_member.is_active = true
    )
  );

drop policy if exists profiles_update_own_contact
  on public.profiles;

create policy profiles_update_own_contact
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ================================================================
-- 7. FUNÇÕES INTERNAS DE AUDITORIA
-- ================================================================

create or replace function public.write_platform_audit(
  target_barbershop_id uuid,
  target_entity_type text,
  target_entity_id text,
  target_action text,
  target_old_data jsonb default null,
  target_new_data jsonb default null,
  target_reason text default null,
  target_support_session_id uuid default null,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select p.email
  into actor_email
  from public.profiles p
  where p.id = auth.uid();

  insert into public.platform_audit_logs (
    actor_id,
    actor_email_snapshot,
    barbershop_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data,
    reason,
    support_session_id,
    metadata
  )
  values (
    auth.uid(),
    actor_email,
    target_barbershop_id,
    target_entity_type,
    target_entity_id,
    target_action,
    target_old_data,
    target_new_data,
    nullif(trim(target_reason), ''),
    target_support_session_id,
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.write_platform_audit(
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  uuid,
  jsonb
) from public, anon, authenticated;

-- ================================================================
-- 8. FEATURE FLAGS EFETIVAS
-- ================================================================

create or replace function public.is_barbershop_feature_enabled(
  target_barbershop_id uuid,
  target_feature_code text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select o.enabled
      from public.barbershop_feature_overrides o
      join public.platform_features f
        on f.id = o.feature_id
      where o.barbershop_id = target_barbershop_id
        and f.code = target_feature_code
        and f.is_active = true
      limit 1
    ),
    (
      select pf.enabled
      from public.subscriptions s
      join public.plan_features pf
        on pf.plan_id = s.plan_id
      join public.platform_features f
        on f.id = pf.feature_id
      where s.barbershop_id = target_barbershop_id
        and f.code = target_feature_code
        and f.is_active = true
      limit 1
    ),
    false
  );
$$;

revoke all on function public.is_barbershop_feature_enabled(
  uuid,
  text
) from public;

grant execute on function public.is_barbershop_feature_enabled(
  uuid,
  text
) to anon, authenticated;

create or replace function public.platform_set_feature_override(
  target_barbershop_id uuid,
  target_feature_code text,
  target_enabled boolean,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  feature_record public.platform_features%rowtype;
  previous_record public.barbershop_feature_overrides%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into feature_record
  from public.platform_features
  where code = target_feature_code
    and is_active = true;

  if not found then
    raise exception 'FEATURE_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.barbershops
    where id = target_barbershop_id
  ) then
    raise exception 'BARBERSHOP_NOT_FOUND';
  end if;

  select *
  into previous_record
  from public.barbershop_feature_overrides
  where barbershop_id = target_barbershop_id
    and feature_id = feature_record.id;

  insert into public.barbershop_feature_overrides (
    barbershop_id,
    feature_id,
    enabled,
    reason,
    updated_by
  )
  values (
    target_barbershop_id,
    feature_record.id,
    target_enabled,
    nullif(trim(target_reason), ''),
    auth.uid()
  )
  on conflict (barbershop_id, feature_id)
  do update set
    enabled = excluded.enabled,
    reason = excluded.reason,
    updated_by = excluded.updated_by,
    updated_at = now();

  perform public.write_platform_audit(
    target_barbershop_id,
    'barbershop_feature_override',
    feature_record.id::text,
    case
      when target_enabled then 'FEATURE_ENABLED'
      else 'FEATURE_DISABLED'
    end,
    case
      when previous_record.barbershop_id is null then null
      else to_jsonb(previous_record)
    end,
    jsonb_build_object(
      'feature_code',
      feature_record.code,
      'enabled',
      target_enabled
    ),
    target_reason
  );
end;
$$;

revoke all on function public.platform_set_feature_override(
  uuid,
  text,
  boolean,
  text
) from public, anon;

grant execute on function public.platform_set_feature_override(
  uuid,
  text,
  boolean,
  text
) to authenticated;

create or replace function public.platform_clear_feature_override(
  target_barbershop_id uuid,
  target_feature_code text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  feature_record public.platform_features%rowtype;
  previous_record public.barbershop_feature_overrides%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into feature_record
  from public.platform_features
  where code = target_feature_code;

  if not found then
    raise exception 'FEATURE_NOT_FOUND';
  end if;

  select *
  into previous_record
  from public.barbershop_feature_overrides
  where barbershop_id = target_barbershop_id
    and feature_id = feature_record.id;

  delete from public.barbershop_feature_overrides
  where barbershop_id = target_barbershop_id
    and feature_id = feature_record.id;

  if found then
    perform public.write_platform_audit(
      target_barbershop_id,
      'barbershop_feature_override',
      feature_record.id::text,
      'FEATURE_OVERRIDE_CLEARED',
      to_jsonb(previous_record),
      jsonb_build_object(
        'feature_code',
        feature_record.code,
        'source',
        'plan'
      ),
      target_reason
    );
  end if;
end;
$$;

revoke all on function public.platform_clear_feature_override(
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.platform_clear_feature_override(
  uuid,
  text,
  text
) to authenticated;

-- ================================================================
-- 9. RESUMO COMERCIAL PARA OWNER/MANAGER
-- ================================================================

create or replace function public.get_my_subscription_summary(
  target_barbershop_id uuid
)
returns table (
  plan_code text,
  plan_name text,
  status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  canceled_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.can_manage_barbershop(target_barbershop_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    p.code,
    p.name,
    s.status::text,
    s.trial_started_at,
    s.trial_ends_at,
    s.activated_at,
    s.suspended_at,
    s.canceled_at,
    s.expires_at
  from public.subscriptions s
  join public.plans p
    on p.id = s.plan_id
  where s.barbershop_id = target_barbershop_id;
end;
$$;

revoke all on function public.get_my_subscription_summary(
  uuid
) from public, anon;

grant execute on function public.get_my_subscription_summary(
  uuid
) to authenticated;

-- ================================================================
-- 10. OPERAÇÕES COMERCIAIS AUDITADAS
-- ================================================================

create or replace function public.platform_change_subscription(
  target_barbershop_id uuid,
  target_plan_id uuid,
  target_status public.subscription_status,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_record public.subscriptions%rowtype;
  new_record public.subscriptions%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if target_status in ('suspended', 'canceled')
     and char_length(trim(coalesce(target_reason, ''))) < 5 then
    raise exception 'REASON_REQUIRED';
  end if;

  select *
  into old_record
  from public.subscriptions
  where barbershop_id = target_barbershop_id
  for update;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.plans
    where id = target_plan_id
      and is_active = true
  ) then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  update public.subscriptions
  set
    plan_id = target_plan_id,
    status = target_status,
    activated_at = case
      when target_status = 'active'
        then coalesce(activated_at, now())
      else activated_at
    end,
    suspended_at = case
      when target_status = 'suspended'
        then now()
      when old_record.status = 'suspended'
        then null
      else suspended_at
    end,
    canceled_at = case
      when target_status = 'canceled'
        then now()
      else canceled_at
    end,
    suspension_reason = case
      when target_status = 'suspended'
        then nullif(trim(target_reason), '')
      when old_record.status = 'suspended'
        then null
      else suspension_reason
    end,
    cancellation_reason = case
      when target_status = 'canceled'
        then nullif(trim(target_reason), '')
      else cancellation_reason
    end,
    status_changed_at = now(),
    updated_at = now()
  where barbershop_id = target_barbershop_id
  returning *
  into new_record;

  perform public.write_platform_audit(
    target_barbershop_id,
    'subscription',
    new_record.id::text,
    'SUBSCRIPTION_CHANGED',
    to_jsonb(old_record),
    to_jsonb(new_record),
    target_reason
  );
end;
$$;

revoke all on function public.platform_change_subscription(
  uuid,
  uuid,
  public.subscription_status,
  text
) from public, anon;

grant execute on function public.platform_change_subscription(
  uuid,
  uuid,
  public.subscription_status,
  text
) to authenticated;

create or replace function public.platform_set_ui_version(
  target_barbershop_id uuid,
  target_ui_version text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_version text;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if target_ui_version not in ('legacy', 'warm-premium') then
    raise exception 'INVALID_UI_VERSION';
  end if;

  select ui_version
  into old_version
  from public.barbershops
  where id = target_barbershop_id
  for update;

  if not found then
    raise exception 'BARBERSHOP_NOT_FOUND';
  end if;

  update public.barbershops
  set
    ui_version = target_ui_version,
    updated_at = now()
  where id = target_barbershop_id;

  perform public.write_platform_audit(
    target_barbershop_id,
    'barbershop',
    target_barbershop_id::text,
    'UI_VERSION_CHANGED',
    jsonb_build_object('ui_version', old_version),
    jsonb_build_object('ui_version', target_ui_version),
    target_reason
  );
end;
$$;

revoke all on function public.platform_set_ui_version(
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.platform_set_ui_version(
  uuid,
  text,
  text
) to authenticated;

-- ================================================================
-- 11. MODO SUPORTE: ABRIR / FECHAR / VALIDAR ESCOPO
-- ================================================================

create or replace function public.platform_open_support_session(
  target_barbershop_id uuid,
  target_reason text,
  target_ticket_reference text,
  target_scopes text[],
  duration_minutes integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_session_id uuid;
  expires timestamp with time zone;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(trim(coalesce(target_reason, ''))) < 5 then
    raise exception 'REASON_REQUIRED';
  end if;

  if duration_minutes not between 5 and 30 then
    raise exception 'INVALID_DURATION';
  end if;

  if target_scopes is null
     or cardinality(target_scopes) = 0
     or not (
       target_scopes <@ array[
         'schedule_read',
         'customer_summary_read',
         'customer_contact_read',
         'payment_read',
         'settings_read'
       ]::text[]
     ) then
    raise exception 'INVALID_SCOPE';
  end if;

  if not exists (
    select 1
    from public.barbershops
    where id = target_barbershop_id
      and archived_at is null
  ) then
    raise exception 'BARBERSHOP_NOT_FOUND';
  end if;

  -- Eu encerro sessões antigas do mesmo operador/tenant antes de abrir outra.
  update public.platform_support_sessions
  set
    closed_at = now(),
    closed_reason = 'Substituída por uma nova sessão de suporte.'
  where platform_admin_id = auth.uid()
    and barbershop_id = target_barbershop_id
    and closed_at is null
    and expires_at > now();

  expires := now() + make_interval(mins => duration_minutes);

  insert into public.platform_support_sessions (
    platform_admin_id,
    barbershop_id,
    reason,
    ticket_reference,
    scopes,
    expires_at
  )
  values (
    auth.uid(),
    target_barbershop_id,
    trim(target_reason),
    nullif(trim(target_ticket_reference), ''),
    target_scopes,
    expires
  )
  returning id
  into new_session_id;

  perform public.write_platform_audit(
    target_barbershop_id,
    'platform_support_session',
    new_session_id::text,
    'SUPPORT_SESSION_OPENED',
    null,
    jsonb_build_object(
      'scopes',
      target_scopes,
      'expires_at',
      expires,
      'ticket_reference',
      nullif(trim(target_ticket_reference), '')
    ),
    target_reason,
    new_session_id
  );

  return new_session_id;
end;
$$;

revoke all on function public.platform_open_support_session(
  uuid,
  text,
  text,
  text[],
  integer
) from public, anon;

grant execute on function public.platform_open_support_session(
  uuid,
  text,
  text,
  text[],
  integer
) to authenticated;

create or replace function public.platform_close_support_session(
  target_support_session_id uuid,
  target_reason text default 'Encerrada manualmente.'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  support_record public.platform_support_sessions%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into support_record
  from public.platform_support_sessions
  where id = target_support_session_id
    and platform_admin_id = auth.uid()
  for update;

  if not found then
    raise exception 'SUPPORT_SESSION_NOT_FOUND';
  end if;

  update public.platform_support_sessions
  set
    closed_at = coalesce(closed_at, now()),
    closed_reason = coalesce(
      closed_reason,
      nullif(trim(target_reason), ''),
      'Encerrada manualmente.'
    )
  where id = target_support_session_id;

  perform public.write_platform_audit(
    support_record.barbershop_id,
    'platform_support_session',
    support_record.id::text,
    'SUPPORT_SESSION_CLOSED',
    to_jsonb(support_record),
    jsonb_build_object(
      'closed_at',
      now()
    ),
    target_reason,
    support_record.id
  );
end;
$$;

revoke all on function public.platform_close_support_session(
  uuid,
  text
) from public, anon;

grant execute on function public.platform_close_support_session(
  uuid,
  text
) to authenticated;

create or replace function public.has_active_platform_support_scope(
  target_barbershop_id uuid,
  required_scope text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_platform_admin()
    and exists (
      select 1
      from public.platform_support_sessions s
      where s.platform_admin_id = auth.uid()
        and s.barbershop_id = target_barbershop_id
        and s.closed_at is null
        and s.expires_at > now()
        and required_scope = any(s.scopes)
    );
$$;

revoke all on function public.has_active_platform_support_scope(
  uuid,
  text
) from public, anon;

grant execute on function public.has_active_platform_support_scope(
  uuid,
  text
) to authenticated;

-- ================================================================
-- 12. LEITURAS DE SUPORTE: SEM IMPERSONAÇÃO
-- ================================================================

create or replace function public.platform_support_list_appointments(
  target_barbershop_id uuid,
  range_start timestamptz,
  range_end timestamptz
)
returns table (
  appointment_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status text,
  customer_id uuid,
  customer_name text,
  barber_name text,
  service_name text,
  public_reference text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  support_session uuid;
begin
  if not public.has_active_platform_support_scope(
    target_barbershop_id,
    'schedule_read'
  ) then
    raise exception 'SUPPORT_SCOPE_REQUIRED';
  end if;

  if range_start is null
     or range_end is null
     or range_end <= range_start
     or range_end > range_start + interval '31 days' then
    raise exception 'INVALID_RANGE';
  end if;

  select s.id
  into support_session
  from public.platform_support_sessions s
  where s.platform_admin_id = auth.uid()
    and s.barbershop_id = target_barbershop_id
    and s.closed_at is null
    and s.expires_at > now()
    and 'schedule_read' = any(s.scopes)
  order by s.created_at desc
  limit 1;

  perform public.write_platform_audit(
    target_barbershop_id,
    'support_query',
    null,
    'SUPPORT_SCHEDULE_VIEWED',
    null,
    null,
    null,
    support_session,
    jsonb_build_object(
      'range_start',
      range_start,
      'range_end',
      range_end
    )
  );

  return query
  select
    a.id,
    a.start_at,
    a.end_at,
    a.status::text,
    c.id,
    c.full_name,
    b.name,
    sv.name,
    a.public_reference
  from public.appointments a
  join public.customers c
    on c.id = a.customer_id
    and c.barbershop_id = a.barbershop_id
  join public.barbers b
    on b.id = a.barber_id
    and b.barbershop_id = a.barbershop_id
  join public.services sv
    on sv.id = a.service_id
    and sv.barbershop_id = a.barbershop_id
  where a.barbershop_id = target_barbershop_id
    and a.start_at >= range_start
    and a.start_at < range_end
  order by a.start_at;
end;
$$;

revoke all on function public.platform_support_list_appointments(
  uuid,
  timestamptz,
  timestamptz
) from public, anon;

grant execute on function public.platform_support_list_appointments(
  uuid,
  timestamptz,
  timestamptz
) to authenticated;

create or replace function public.platform_support_get_customer_contact(
  target_barbershop_id uuid,
  target_customer_id uuid
)
returns table (
  customer_id uuid,
  full_name text,
  email text,
  phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  support_session uuid;
begin
  if not public.has_active_platform_support_scope(
    target_barbershop_id,
    'customer_contact_read'
  ) then
    raise exception 'SUPPORT_SCOPE_REQUIRED';
  end if;

  select s.id
  into support_session
  from public.platform_support_sessions s
  where s.platform_admin_id = auth.uid()
    and s.barbershop_id = target_barbershop_id
    and s.closed_at is null
    and s.expires_at > now()
    and 'customer_contact_read' = any(s.scopes)
  order by s.created_at desc
  limit 1;

  if not exists (
    select 1
    from public.customers
    where id = target_customer_id
      and barbershop_id = target_barbershop_id
  ) then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  perform public.write_platform_audit(
    target_barbershop_id,
    'customer',
    target_customer_id::text,
    'SUPPORT_CUSTOMER_CONTACT_VIEWED',
    null,
    null,
    null,
    support_session
  );

  return query
  select
    c.id,
    c.full_name,
    c.email,
    c.phone
  from public.customers c
  where c.id = target_customer_id
    and c.barbershop_id = target_barbershop_id;
end;
$$;

revoke all on function public.platform_support_get_customer_contact(
  uuid,
  uuid
) from public, anon;

grant execute on function public.platform_support_get_customer_contact(
  uuid,
  uuid
) to authenticated;

-- ================================================================
-- 13. ONBOARDING NOVO: TRIAL 15 DIAS, SEM ALTERAR EXISTENTES
-- ================================================================

create or replace function public.create_barbershop_with_owner(
  barbershop_name text,
  barbershop_slug text,
  owner_email text,
  existing_organization_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile public.profiles%rowtype;
  organization_id uuid;
  new_barbershop_id uuid;
  starter_plan_id uuid;
  new_subscription_id uuid;
  trial_start timestamptz := now();
  trial_end timestamptz := now() + interval '15 days';
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if barbershop_name is null
     or char_length(trim(barbershop_name)) not between 2 and 100
     or barbershop_slug is null
     or length(barbershop_slug) > 60
     or barbershop_slug in (
       'admin',
       'api',
       'auth',
       'plataforma',
       'avaliar',
       'login',
       'reservar',
       'cliente',
       'completar-cadastro'
     )
     or barbershop_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_DATA';
  end if;

  select p.*
  into owner_profile
  from public.profiles p
  join auth.users u
    on u.id = p.id
  where lower(u.email) = lower(trim(owner_email))
    and p.is_active = true;

  if not found then
    raise exception 'OWNER_NOT_FOUND';
  end if;

  if coalesce(owner_profile.is_platform_admin, false) then
    raise exception 'OWNER_PLATFORM_ADMIN_CONFLICT';
  end if;

  if existing_organization_id is null then
    insert into public.organizations (
      name,
      owner_profile_id
    )
    values (
      trim(barbershop_name),
      owner_profile.id
    )
    returning id
    into organization_id;
  else
    select id
    into organization_id
    from public.organizations
    where id = existing_organization_id
      and owner_profile_id = owner_profile.id;

    if not found then
      raise exception 'ORGANIZATION_OWNER_MISMATCH';
    end if;
  end if;

  insert into public.barbershops (
    organization_id,
    name,
    slug,
    primary_color,
    secondary_color,
    ui_version
  )
  values (
    organization_id,
    trim(barbershop_name),
    barbershop_slug,
    '#B8873F',
    '#000000',
    'warm-premium'
  )
  returning id
  into new_barbershop_id;

  update public.profiles
  set
    role = 'admin',
    updated_at = now()
  where id = owner_profile.id;

  insert into public.barbershop_members (
    barbershop_id,
    profile_id,
    role
  )
  values (
    new_barbershop_id,
    owner_profile.id,
    'owner'
  );

  insert into public.business_settings (
    barbershop_id,
    business_name,
    primary_color,
    secondary_color
  )
  values (
    new_barbershop_id,
    trim(barbershop_name),
    '#B8873F',
    '#000000'
  );

  insert into public.loyalty_programs (
    barbershop_id,
    name
  )
  values (
    new_barbershop_id,
    'Clube ' || trim(barbershop_name)
  );

  insert into public.notification_settings (
    barbershop_id
  )
  values (
    new_barbershop_id
  );

  insert into public.message_templates (
    barbershop_id,
    type,
    channel,
    subject,
    content
  )
  values
    (
      new_barbershop_id,
      'birthday',
      'email',
      'Feliz aniversário, {{nome}}!',
      'Parabéns, {{nome}}! A equipe da {{barbearia}} deseja um excelente aniversário.'
    ),
    (
      new_barbershop_id,
      'satisfaction_survey',
      'email',
      'Como foi seu atendimento?',
      'Olá, {{nome}}! Conte como foi seu atendimento na {{barbearia}}: {{link_avaliacao}}'
    );

  select id
  into starter_plan_id
  from public.plans
  where code = 'starter'
    and is_active = true;

  if starter_plan_id is null then
    raise exception 'STARTER_PLAN_NOT_FOUND';
  end if;

  insert into public.subscriptions (
    barbershop_id,
    plan_id,
    status,
    trial_started_at,
    trial_ends_at,
    started_at,
    status_changed_at
  )
  values (
    new_barbershop_id,
    starter_plan_id,
    'trial',
    trial_start,
    trial_end,
    trial_start,
    trial_start
  )
  returning id
  into new_subscription_id;

  perform public.write_platform_audit(
    new_barbershop_id,
    'barbershop',
    new_barbershop_id::text,
    'TENANT_CREATED',
    null,
    jsonb_build_object(
      'name',
      trim(barbershop_name),
      'slug',
      barbershop_slug,
      'owner_profile_id',
      owner_profile.id,
      'subscription_id',
      new_subscription_id,
      'trial_started_at',
      trial_start,
      'trial_ends_at',
      trial_end
    ),
    'Onboarding de nova barbearia.'
  );

  return new_barbershop_id;
end;
$$;

revoke all on function public.create_barbershop_with_owner(
  text,
  text,
  text,
  uuid
) from public, anon;

grant execute on function public.create_barbershop_with_owner(
  text,
  text,
  text,
  uuid
) to authenticated;

commit;

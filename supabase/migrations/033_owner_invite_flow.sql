-- 033_owner_invite_flow.sql
--
-- Onboarding por convite: Platform Admin cria o tenant sem exigir que a
-- conta do dono exista em auth.users. O dono recebe um link de convite,
-- cria a própria senha, e o vínculo owner é ativado pelo trigger
-- handle_new_user ao aceitar.
--
-- Regras:
--   - Um mesmo profile só pode ser owner de UMA barbearia.
--   - Um e-mail só pode ter UM convite pendente por vez.
--   - Nenhuma senha temporária em texto. Nenhum user_metadata como controle.

begin;

-- 1) Tabela de convites pendentes
create table if not exists public.pending_tenant_invites (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

create index if not exists pending_invites_email_idx
  on public.pending_tenant_invites (lower(email))
  where accepted_at is null;

-- Um e-mail = um convite pendente por vez
create unique index if not exists one_pending_invite_per_email
  on public.pending_tenant_invites (lower(email))
  where accepted_at is null;

alter table public.pending_tenant_invites enable row level security;

revoke all on public.pending_tenant_invites from public, anon, authenticated;
grant select on public.pending_tenant_invites to authenticated;

drop policy if exists pending_invites_platform_read on public.pending_tenant_invites;
create policy pending_invites_platform_read on public.pending_tenant_invites
for select using (public.is_platform_admin());

-- 2) Um profile só pode ser owner de uma barbearia ativa
do $$
declare
  conflitos integer;
begin
  select count(*) into conflitos
  from (
    select profile_id
    from public.barbershop_members
    where role = 'owner' and is_active = true
    group by profile_id
    having count(*) > 1
  ) x;

  if conflitos > 0 then
    raise exception 'Existem % profiles owner de mais de uma barbearia. Resolva antes de aplicar.', conflitos;
  end if;
end;
$$;

create unique index if not exists one_active_owner_per_profile
  on public.barbershop_members (profile_id)
  where role = 'owner' and is_active = true;

commit;

-- 3) RPC que cria o tenant sem exigir que o dono exista ainda
create or replace function public.platform_create_tenant_pending_owner(
  new_name text,
  new_slug text,
  owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_barbershop_id uuid;
  new_organization_id uuid;
  starter_plan_id uuid;
  normalized_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if new_name is null
     or char_length(trim(new_name)) not between 2 and 100
     or new_slug is null
     or length(new_slug) > 60
     or new_slug in (
       'admin','api','auth','plataforma','avaliar','login',
       'reservar','cliente','completar-cadastro'
     )
     or new_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  then
    raise exception 'INVALID_DATA';
  end if;

  normalized_email := nullif(lower(trim(coalesce(owner_email, ''))), '');
  if normalized_email is null
     or length(normalized_email) > 254
     or normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  then
    raise exception 'INVALID_EMAIL';
  end if;

  -- Verifica se e-mail já é dono ativo de outra barbearia
  if exists (
    select 1
    from public.barbershop_members m
    join public.profiles p on p.id = m.profile_id
    join auth.users u on u.id = p.id
    where m.role = 'owner'
      and m.is_active = true
      and lower(u.email) = normalized_email
  ) then
    raise exception 'OWNER_ALREADY_HAS_TENANT';
  end if;

  -- Verifica se já existe convite pendente para este e-mail
  if exists (
    select 1 from public.pending_tenant_invites
    where lower(email) = normalized_email
      and accepted_at is null
      and expires_at > now()
  ) then
    raise exception 'INVITE_ALREADY_PENDING';
  end if;

  -- Cria organização + barbearia (sem vínculo de dono ainda)
  insert into public.organizations (name)
  values (trim(new_name))
  returning id into new_organization_id;

  insert into public.barbershops (
    organization_id, name, slug, primary_color, secondary_color, ui_version
  )
  values (
    new_organization_id, trim(new_name), new_slug,
    '#B8873F', '#000000', 'warm-premium'
  )
  returning id into new_barbershop_id;

  insert into public.business_settings (
    barbershop_id, business_name, primary_color, secondary_color
  )
  values (
    new_barbershop_id, trim(new_name), '#B8873F', '#000000'
  );

  insert into public.loyalty_programs (barbershop_id, name)
  values (new_barbershop_id, 'Clube ' || trim(new_name));

  insert into public.notification_settings (barbershop_id)
  values (new_barbershop_id);

  insert into public.message_templates (
    barbershop_id, type, channel, subject, content
  )
  values
    (new_barbershop_id, 'birthday', 'email',
     'Feliz aniversário, {{nome}}!',
     'Parabéns, {{nome}}! A equipe da {{barbearia}} deseja um excelente aniversário.'),
    (new_barbershop_id, 'satisfaction_survey', 'email',
     'Como foi seu atendimento?',
     'Olá, {{nome}}! Conte como foi seu atendimento na {{barbearia}}: {{link_avaliacao}}');

  select id into starter_plan_id
  from public.plans
  where code = 'starter' and is_active = true;

  if starter_plan_id is null then
    raise exception 'STARTER_PLAN_NOT_FOUND';
  end if;

  insert into public.subscriptions (
    barbershop_id, plan_id, status,
    trial_started_at, trial_ends_at, started_at, status_changed_at
  )
  values (
    new_barbershop_id, starter_plan_id, 'trial',
    now(), now() + interval '15 days', now(), now()
  );

  insert into public.pending_tenant_invites (barbershop_id, email)
  values (new_barbershop_id, normalized_email);

  perform public.write_platform_audit(
    new_barbershop_id,
    'barbershop',
    new_barbershop_id::text,
    'TENANT_CREATED_PENDING_OWNER',
    null,
    jsonb_build_object(
      'name', trim(new_name),
      'slug', new_slug,
      'owner_email', normalized_email
    ),
    'Onboarding com convite pendente.'
  );

  return new_barbershop_id;
end;
$$;

revoke all on function public.platform_create_tenant_pending_owner(text, text, text)
  from public, anon;
grant execute on function public.platform_create_tenant_pending_owner(text, text, text)
  to authenticated;

-- 4) Trigger handle_new_user modificado:
--    se houver convite pendente para o e-mail, ativa o vínculo owner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  detected_provider public.auth_provider;
  invite_record public.pending_tenant_invites%rowtype;
  normalized_email text;
begin
  detected_provider := case
    when new.phone is not null then 'phone'::public.auth_provider
    else 'google'::public.auth_provider
  end;

  insert into public.profiles (
    id, full_name, email, phone, avatar_url, provider, last_login_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), ''),
    new.raw_user_meta_data ->> 'avatar_url',
    detected_provider,
    now()
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    last_login_at = now(),
    updated_at = now();

  normalized_email := nullif(lower(trim(coalesce(new.email, ''))), '');

  if normalized_email is not null then
    select * into invite_record
    from public.pending_tenant_invites
    where lower(email) = normalized_email
      and accepted_at is null
      and expires_at > now()
    order by created_at desc
    limit 1;

    if found then
      update public.profiles
      set role = 'admin', updated_at = now()
      where id = new.id;

      insert into public.barbershop_members (barbershop_id, profile_id, role)
      values (invite_record.barbershop_id, new.id, 'owner')
      on conflict (barbershop_id, profile_id) do update
        set role = 'owner', is_active = true, updated_at = now();

      update public.pending_tenant_invites
      set accepted_at = now()
      where id = invite_record.id;

      perform public.write_platform_audit(
        invite_record.barbershop_id,
        'barbershop_member',
        new.id::text,
        'OWNER_INVITE_ACCEPTED',
        null,
        jsonb_build_object('email', normalized_email),
        'Dono aceitou o convite e virou owner.'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

commit;

-- 014_appointment_functions.sql
-- Eu concentro as operações críticas em funções transacionais para evitar corrida e manipulação no navegador.

begin;

create or replace function public.book_appointment(
  target_barbershop_id uuid,
  target_barber_id uuid,
  target_service_id uuid,
  target_start_at timestamptz,
  target_client_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_service public.services%rowtype;
  selected_barbershop public.barbershops%rowtype;
  selected_settings public.business_settings%rowtype;
  customer_record public.customers%rowtype;
  profile_record public.profiles%rowtype;
  target_end_at timestamptz;
  local_start timestamp;
  local_end timestamp;
  appointment_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if target_start_at <= now() then raise exception 'PAST_APPOINTMENT'; end if;
  if char_length(coalesce(target_client_notes, '')) > 500 then raise exception 'NOTES_TOO_LONG'; end if;

  select * into selected_barbershop from public.barbershops
  where id = target_barbershop_id and is_active = true;
  if not found then raise exception 'BARBERSHOP_UNAVAILABLE'; end if;

  select * into profile_record from public.profiles where id = auth.uid() and is_active = true;
  if not found or profile_record.full_name is null or profile_record.phone is null then
    raise exception 'PROFILE_INCOMPLETE';
  end if;

  insert into public.customers (barbershop_id, profile_id, full_name, email, phone)
  values (target_barbershop_id, auth.uid(), profile_record.full_name, profile_record.email, profile_record.phone)
  on conflict (barbershop_id, profile_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    updated_at = now()
  returning * into customer_record;

  select * into selected_service from public.services
  where id = target_service_id and barbershop_id = target_barbershop_id and is_active = true;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;

  if not exists (
    select 1 from public.barber_services
    where barbershop_id = target_barbershop_id
      and barber_id = target_barber_id
      and service_id = target_service_id
      and is_active = true
  ) then raise exception 'BARBER_SERVICE_UNAVAILABLE'; end if;

  perform 1 from public.barbers where id=target_barber_id and barbershop_id=target_barbershop_id and is_active for update;
  if not found then raise exception 'BARBER_UNAVAILABLE'; end if;

  target_end_at := target_start_at + make_interval(mins => selected_service.duration_minutes);
  local_start := target_start_at at time zone selected_barbershop.timezone;
  local_end := target_end_at at time zone selected_barbershop.timezone;

  select * into selected_settings from public.business_settings where barbershop_id = target_barbershop_id;
  if target_start_at > now() + make_interval(days => coalesce(selected_settings.booking_advance_days, 30)) then
    raise exception 'ADVANCE_LIMIT';
  end if;

  if local_start::date <> local_end::date then raise exception 'OUTSIDE_BUSINESS_HOURS'; end if;
  if not exists (
    select 1 from public.business_hours h
    where h.barbershop_id = target_barbershop_id
      and h.barber_id = target_barber_id
      and h.is_active = true
      and h.day_of_week = extract(dow from local_start)::integer
      and local_start::time >= h.start_time
      and local_end::time <= h.end_time
      and not (
        h.break_start is not null and h.break_end is not null
        and local_start::time < h.break_end and local_end::time > h.break_start
      )
  ) then raise exception 'OUTSIDE_BUSINESS_HOURS'; end if;

  if exists (
    select 1 from public.blocked_slots b
    where b.barbershop_id = target_barbershop_id
      and b.barber_id = target_barber_id
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(target_start_at, target_end_at, '[)')
  ) then raise exception 'SLOT_BLOCKED'; end if;

  insert into public.appointments (
    barbershop_id, customer_id, client_id, barber_id, service_id,
    start_at, end_at, status, total_price, client_notes
  ) values (
    target_barbershop_id, customer_record.id, auth.uid(), target_barber_id, target_service_id,
    target_start_at, target_end_at, 'pending', selected_service.price, nullif(trim(target_client_notes), '')
  ) returning id into appointment_id;

  insert into public.appointment_events (barbershop_id, appointment_id, event_type, description, created_by)
  values (target_barbershop_id, appointment_id, 'created_by_client', 'Reserva criada pelo cliente.', auth.uid());

  return appointment_id;
exception
  when exclusion_violation then raise exception 'SLOT_UNAVAILABLE';
end;
$$;

create or replace function public.cancel_my_appointment(target_appointment_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
  selected_settings public.business_settings%rowtype;
begin
  select * into appointment_record from public.appointments
  where id = target_appointment_id and client_id = auth.uid()
  for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if appointment_record.status not in ('pending', 'confirmed') then raise exception 'INVALID_STATUS'; end if;

  select * into selected_settings from public.business_settings where barbershop_id = appointment_record.barbershop_id;
  if appointment_record.start_at < now() + make_interval(hours => coalesce(selected_settings.cancellation_limit_hours, 4)) then
    raise exception 'CANCELLATION_LIMIT';
  end if;

  update public.appointments set
    status = 'canceled', canceled_at = now(), cancellation_reason = nullif(trim(reason), ''), updated_at = now()
  where id = target_appointment_id;

  insert into public.appointment_events (barbershop_id, appointment_id, event_type, description, created_by)
  values (appointment_record.barbershop_id, appointment_record.id, 'canceled', coalesce(nullif(trim(reason), ''), 'Cancelado pelo cliente.'), auth.uid());
end;
$$;

create or replace function public.award_completed_appointment_loyalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  program_record public.loyalty_programs%rowtype;
  earned_points integer := 0;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select * into program_record from public.loyalty_programs
  where barbershop_id = new.barbershop_id and is_active = true;
  if not found then return new; end if;

  earned_points := case program_record.earning_mode
    when 'visit' then program_record.points_per_visit
    when 'amount' then floor(new.total_price * program_record.points_per_currency)::integer
    when 'service' then coalesce((
      select points_earned from public.loyalty_service_rules
      where loyalty_program_id = program_record.id and service_id = new.service_id and is_active = true
    ), 0)
  end;

  if earned_points <= 0 then return new; end if;

  insert into public.loyalty_transactions (
    barbershop_id, customer_id, appointment_id, type, points, description, idempotency_key, created_by
  ) values (
    new.barbershop_id, new.customer_id, new.id, 'earned', earned_points,
    'Pontos do atendimento concluído.', 'appointment:' || new.id || ':earned', auth.uid()
  ) on conflict (idempotency_key) do nothing;

  if found then
    insert into public.loyalty_accounts (barbershop_id, customer_id, current_points, lifetime_points)
    values (new.barbershop_id, new.customer_id, earned_points, earned_points)
    on conflict (barbershop_id, customer_id) do update set
      current_points = loyalty_accounts.current_points + excluded.current_points,
      lifetime_points = loyalty_accounts.lifetime_points + excluded.lifetime_points,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger award_loyalty_after_completion
after update of status on public.appointments
for each row execute function public.award_completed_appointment_loyalty();

create or replace function public.request_feedback_after_completion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  settings_record public.notification_settings%rowtype;
  customer_record public.customers%rowtype;
  barbershop_record public.barbershops%rowtype;
  template_record public.message_templates%rowtype;
  plain_token text;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select * into settings_record from public.notification_settings where barbershop_id = new.barbershop_id;
  if not found or not settings_record.satisfaction_enabled then return new; end if;

  select * into customer_record from public.customers where id = new.customer_id;
  if settings_record.satisfaction_channel <> 'email' or customer_record.email is null or not customer_record.allow_email then
    return new;
  end if;

  select * into barbershop_record from public.barbershops where id = new.barbershop_id;
  select * into template_record from public.message_templates
  where barbershop_id = new.barbershop_id and type = 'satisfaction_survey'
    and channel = settings_record.satisfaction_channel and is_active = true;
  if not found then return new; end if;

  plain_token := encode(gen_random_bytes(32), 'hex');

  insert into public.appointment_feedback (
    barbershop_id, appointment_id, customer_id, barber_id, token_hash
  ) values (
    new.barbershop_id, new.id, new.customer_id, new.barber_id, digest(plain_token, 'sha256')
  ) on conflict (appointment_id) do nothing;

  if found then
    insert into public.outbound_notifications (
      barbershop_id, customer_id, appointment_id, type, channel, recipient,
      subject, content, payload, idempotency_key
    ) values (
      new.barbershop_id, new.customer_id, new.id, 'satisfaction_survey', 'email', customer_record.email,
      coalesce(template_record.subject, 'Como foi seu atendimento?'), template_record.content,
      jsonb_build_object(
        'nome', customer_record.full_name,
        'barbearia', barbershop_record.name,
        'barbershop_slug', barbershop_record.slug,
        'survey_token', plain_token
      ),
      'satisfaction:' || new.id
    ) on conflict (idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

create trigger request_feedback_after_completion
after update of status on public.appointments
for each row execute function public.request_feedback_after_completion();

create or replace function public.submit_appointment_feedback(token text, score integer, feedback_comment text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if token is null or token !~ '^[a-f0-9]{64}$' or score is null or score not between 1 and 5 or char_length(coalesce(feedback_comment, '')) > 1000 then return false; end if;
  if not exists(select 1 from public.appointment_feedback where token_hash=digest(token,'sha256') and submitted_at is null and expires_at>now()) then return false; end if;

  insert into public.rate_limits (key, attempts, window_started_at, updated_at)
  values ('feedback:' || encode(digest(token, 'sha256'), 'hex'), 1, now(), now())
  on conflict (key) do update set
    attempts = case when rate_limits.window_started_at < now() - interval '1 hour' then 1 else rate_limits.attempts + 1 end,
    window_started_at = case when rate_limits.window_started_at < now() - interval '1 hour' then now() else rate_limits.window_started_at end,
    updated_at = now();

  if (select attempts from public.rate_limits where key = 'feedback:' || encode(digest(token, 'sha256'), 'hex')) > 10 then
    return false;
  end if;

  update public.appointment_feedback set
    rating = score,
    comment = nullif(trim(feedback_comment), ''),
    submitted_at = now()
  where token_hash = digest(token, 'sha256')
    and submitted_at is null
    and expires_at > now();

  return found;
end;
$$;

create or replace function public.enqueue_birthday_notifications(reference_date date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_count integer := 0;
  candidate record;
begin
  if auth.role() <> 'service_role' and not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;

  for candidate in
    select c.*, b.name as barbershop_name, b.timezone as barbershop_timezone,
      ns.birthday_send_time, mt.subject, mt.content,
      coalesce(reference_date, (now() at time zone b.timezone)::date) as local_date
    from public.customers c
    join public.barbershops b on b.id = c.barbershop_id and b.is_active = true
    join public.notification_settings ns on ns.barbershop_id = c.barbershop_id
      and ns.birthday_enabled = true and ns.birthday_channel = 'email'
    join public.message_templates mt on mt.barbershop_id = c.barbershop_id
      and mt.type = 'birthday' and mt.channel = 'email' and mt.is_active = true
    where c.birth_date is not null and c.allow_email = true and c.email is not null
      and extract(month from c.birth_date) = extract(month from coalesce(reference_date, (now() at time zone b.timezone)::date))
      and extract(day from c.birth_date) = extract(day from coalesce(reference_date, (now() at time zone b.timezone)::date))
  loop
    insert into public.outbound_notifications (
      barbershop_id, customer_id, type, channel, recipient, subject, content, payload, scheduled_at, idempotency_key
    ) values (
      candidate.barbershop_id, candidate.id, 'birthday', 'email', candidate.email,
      candidate.subject, candidate.content,
      jsonb_build_object('nome', candidate.full_name, 'barbearia', candidate.barbershop_name),
      (candidate.local_date + candidate.birthday_send_time) at time zone candidate.barbershop_timezone,
      'birthday:' || candidate.barbershop_id || ':' || candidate.id || ':' || extract(year from candidate.local_date)::integer
    ) on conflict (idempotency_key) do nothing;
    if found then queued_count := queued_count + 1; end if;
  end loop;

  return queued_count;
end;
$$;

create or replace function public.redeem_loyalty_reward(target_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reward_record public.loyalty_rewards%rowtype;
  customer_record public.customers%rowtype;
  account_record public.loyalty_accounts%rowtype;
  transaction_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into reward_record from public.loyalty_rewards where id = target_reward_id and is_active = true;
  if not found then raise exception 'REWARD_NOT_FOUND'; end if;
  if not exists (select 1 from public.loyalty_programs where id = reward_record.loyalty_program_id and is_active = true) then
    raise exception 'PROGRAM_INACTIVE';
  end if;
  select * into customer_record from public.customers
  where barbershop_id = reward_record.barbershop_id and profile_id = auth.uid();
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  select * into account_record from public.loyalty_accounts
  where barbershop_id = reward_record.barbershop_id and customer_id = customer_record.id for update;
  if not found or account_record.current_points < reward_record.points_cost then raise exception 'INSUFFICIENT_POINTS'; end if;

  update public.loyalty_accounts set current_points = current_points - reward_record.points_cost, updated_at = now()
  where id = account_record.id;
  insert into public.loyalty_transactions (
    barbershop_id, customer_id, reward_id, type, points, description, idempotency_key, created_by
  ) values (
    reward_record.barbershop_id, customer_record.id, reward_record.id, 'redeemed', -reward_record.points_cost,
    'Resgate: ' || reward_record.name, 'redemption:' || gen_random_uuid(), auth.uid()
  ) returning id into transaction_id;
  return transaction_id;
end;
$$;

create or replace function public.mark_appointment_completed(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  select * into appointment_record from public.appointments where id = target_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if not public.can_manage_barbershop(appointment_record.barbershop_id)
    and not public.is_barber_profile(appointment_record.barber_id) then raise exception 'FORBIDDEN'; end if;
  if appointment_record.status not in ('pending', 'confirmed') then raise exception 'INVALID_STATUS'; end if;

  update public.appointments set status = 'completed', completed_at = now(), updated_at = now()
  where id = appointment_record.id;

  insert into public.appointment_events (barbershop_id, appointment_id, event_type, description, created_by)
  values (appointment_record.barbershop_id, appointment_record.id, 'completed', 'Atendimento concluído no painel administrativo.', auth.uid());
end;
$$;

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
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  if barbershop_name is null or char_length(trim(barbershop_name)) not between 2 and 100 or barbershop_slug is null or length(barbershop_slug)>60 or barbershop_slug in ('admin','api','auth','plataforma','avaliar','login','reservar','cliente','completar-cadastro') or barbershop_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_DATA';
  end if;

  select p.* into owner_profile from public.profiles p join auth.users u on u.id=p.id where lower(u.email) = lower(trim(owner_email)) and p.is_active = true;
  if not found then raise exception 'OWNER_NOT_FOUND'; end if;

  if existing_organization_id is null then
    insert into public.organizations (name, owner_profile_id) values (trim(barbershop_name), owner_profile.id) returning id into organization_id;
  else
    select id into organization_id from public.organizations where id=existing_organization_id and owner_profile_id=owner_profile.id;
    if not found then raise exception 'ORGANIZATION_OWNER_MISMATCH'; end if;
  end if;

  insert into public.barbershops (organization_id, name, slug)
  values (organization_id, trim(barbershop_name), barbershop_slug) returning id into new_barbershop_id;

  update public.profiles set role = 'admin', updated_at = now() where id = owner_profile.id;
  insert into public.barbershop_members (barbershop_id, profile_id, role)
  values (new_barbershop_id, owner_profile.id, 'owner');
  insert into public.business_settings (barbershop_id, business_name)
  values (new_barbershop_id, trim(barbershop_name));
  insert into public.loyalty_programs (barbershop_id, name)
  values (new_barbershop_id, 'Clube ' || trim(barbershop_name));
  insert into public.notification_settings (barbershop_id) values (new_barbershop_id);
  insert into public.message_templates (barbershop_id, type, channel, subject, content) values
    (new_barbershop_id, 'birthday', 'email', 'Feliz aniversário, {{nome}}!', 'Parabéns, {{nome}}! A equipe da {{barbearia}} deseja um excelente aniversário.'),
    (new_barbershop_id, 'satisfaction_survey', 'email', 'Como foi seu atendimento?', 'Olá, {{nome}}! Conte como foi seu atendimento na {{barbearia}}: {{link_avaliacao}}');

  select id into starter_plan_id from public.plans where code = 'starter';
  insert into public.subscriptions (barbershop_id, plan_id, status, trial_ends_at)
  values (new_barbershop_id, starter_plan_id, 'trial', now() + interval '30 days');

  return new_barbershop_id;
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, text) from public;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text) to authenticated;
revoke all on function public.cancel_my_appointment(uuid, text) from public;
grant execute on function public.cancel_my_appointment(uuid, text) to authenticated;
revoke all on function public.submit_appointment_feedback(text, integer, text) from public;
grant execute on function public.submit_appointment_feedback(text, integer, text) to anon, authenticated;
revoke all on function public.enqueue_birthday_notifications(date) from public, anon, authenticated;
grant execute on function public.enqueue_birthday_notifications(date) to service_role;
revoke all on function public.mark_appointment_completed(uuid) from public;
grant execute on function public.mark_appointment_completed(uuid) to authenticated;
revoke all on function public.create_barbershop_with_owner(text, text, text, uuid) from public;
grant execute on function public.create_barbershop_with_owner(text, text, text, uuid) to authenticated;
revoke all on function public.redeem_loyalty_reward(uuid) from public;
grant execute on function public.redeem_loyalty_reward(uuid) to authenticated;

grant select on public.loyalty_programs, public.loyalty_service_rules, public.loyalty_rewards to anon, authenticated;
grant select on public.loyalty_accounts, public.loyalty_transactions to authenticated;
grant select, insert, update, delete on public.loyalty_programs, public.loyalty_service_rules, public.loyalty_rewards to authenticated;
grant select, insert, update, delete on public.notification_settings, public.message_templates to authenticated;
grant select on public.outbound_notifications, public.appointment_feedback to authenticated;

commit;

-- 003_functions.sql
-- Funções de apoio para criação de perfil após login OAuth/telefone.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  detected_provider public.auth_provider;
begin
  detected_provider := case
    when new.phone is not null then 'phone'::public.auth_provider
    else 'google'::public.auth_provider
  end;

  insert into public.profiles (id, full_name, email, phone, avatar_url, provider, last_login_at)
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.mark_appointment_completed(target_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem concluir atendimento por esta função.';
  end if;

  update public.appointments
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = target_appointment_id;

  insert into public.appointment_events (appointment_id, event_type, description, created_by)
  values (target_appointment_id, 'completed', 'Atendimento concluído no painel administrativo.', auth.uid());
end;
$$;

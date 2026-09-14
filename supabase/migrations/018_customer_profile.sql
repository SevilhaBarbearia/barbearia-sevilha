begin;
-- Eu atualizo identidade e vínculo em uma transação, sem liberar alterações de tenant pela API.
create or replace function public.save_my_customer(target_barbershop_id uuid,customer_name text,customer_phone text,customer_email text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.barbershops where id=target_barbershop_id and is_active) then raise exception 'SHOP_NOT_FOUND'; end if;
 if customer_name is null or length(trim(customer_name)) not between 2 and 100
 or customer_phone is null or customer_phone !~ '^[0-9]{10,15}$'
 or (customer_email is not null and (length(customer_email)>254 or customer_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')) then raise exception 'INVALID_PROFILE'; end if;
 update public.profiles set full_name=trim(customer_name),phone=customer_phone,email=customer_email,updated_at=now() where id=auth.uid();
 insert into public.customers(barbershop_id,profile_id,full_name,phone,email)
 values(target_barbershop_id,auth.uid(),trim(customer_name),customer_phone,customer_email)
 on conflict(barbershop_id,profile_id) do update set full_name=excluded.full_name,phone=excluded.phone,email=excluded.email,updated_at=now();
end; $$;
create or replace function public.save_my_preferences(target_barbershop_id uuid,customer_birth_date date,email_allowed boolean,whatsapp_allowed boolean)
returns void language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype;
begin
 select * into p from public.profiles where id=auth.uid() and is_active;
 if not found then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.barbershops where id=target_barbershop_id and is_active) then raise exception 'SHOP_NOT_FOUND'; end if;
 if customer_birth_date>current_date or customer_birth_date<date '1900-01-01' or email_allowed is null or whatsapp_allowed is null then raise exception 'INVALID_PREFERENCES'; end if;
 insert into public.customers(barbershop_id,profile_id,full_name,phone,email,birth_date,allow_email,allow_whatsapp)
 values(target_barbershop_id,p.id,p.full_name,p.phone,p.email,customer_birth_date,email_allowed,whatsapp_allowed)
 on conflict(barbershop_id,profile_id) do update set birth_date=excluded.birth_date,allow_email=excluded.allow_email,allow_whatsapp=excluded.allow_whatsapp,updated_at=now();
end; $$;
revoke all on function public.save_my_customer(uuid,text,text,text),public.save_my_preferences(uuid,date,boolean,boolean) from public,anon;
grant execute on function public.save_my_customer(uuid,text,text,text),public.save_my_preferences(uuid,date,boolean,boolean) to authenticated;
commit;

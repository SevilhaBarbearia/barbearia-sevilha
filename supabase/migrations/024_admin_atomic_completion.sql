-- 024_admin_atomic_completion.sql
-- Conclusão de atendimento + pagamento em uma única transação.
-- Mantém RBAC por tenant e impede marcar como concluído sem registrar pagamento.

begin;

create or replace function public.complete_appointment_with_payment(
  target_barbershop_id uuid,
  target_appointment_id uuid,
  payment_amount numeric,
  payment_method_value public.payment_method
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.can_manage_barbershop(target_barbershop_id) then
    raise exception 'FORBIDDEN';
  end if;

  if payment_amount is null or payment_amount < 0 then
    raise exception 'INVALID_PAYMENT_AMOUNT';
  end if;

  select *
  into appointment_record
  from public.appointments
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if appointment_record.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  insert into public.presencial_payments (
    barbershop_id,
    appointment_id,
    amount,
    method,
    status,
    received_by,
    paid_at,
    updated_at
  )
  values (
    target_barbershop_id,
    appointment_record.id,
    payment_amount,
    payment_method_value,
    'paid',
    auth.uid(),
    now(),
    now()
  )
  on conflict (appointment_id)
  do update set
    barbershop_id = excluded.barbershop_id,
    amount = excluded.amount,
    method = excluded.method,
    status = 'paid',
    received_by = auth.uid(),
    paid_at = now(),
    updated_at = now();

  update public.appointments
  set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where id = appointment_record.id;

  insert into public.appointment_events (
    barbershop_id,
    appointment_id,
    event_type,
    description,
    created_by
  )
  values (
    target_barbershop_id,
    appointment_record.id,
    'completed_with_payment',
    'Atendimento concluído com pagamento registrado de forma atômica.',
    auth.uid()
  );
end;
$$;

-- Compatibilidade segura: qualquer chamada antiga também passa a gerar
-- pagamento na mesma transação. Como a assinatura antiga não recebe método,
-- registramos "outro"; a interface nova sempre usa a função acima e solicita
-- explicitamente Pix/Crédito/Débito/Dinheiro.
create or replace function public.mark_appointment_completed(
  target_appointment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into appointment_record
  from public.appointments
  where id = target_appointment_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if not public.can_manage_barbershop(
    appointment_record.barbershop_id
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if appointment_record.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  perform public.complete_appointment_with_payment(
    appointment_record.barbershop_id,
    appointment_record.id,
    appointment_record.total_price,
    'outro'::public.payment_method
  );
end;
$$;

revoke all
on function public.mark_appointment_completed(uuid)
from public;

grant execute
on function public.mark_appointment_completed(uuid)
to authenticated;

revoke all
on function public.complete_appointment_with_payment(
  uuid,
  uuid,
  numeric,
  public.payment_method
)
from public;

grant execute
on function public.complete_appointment_with_payment(
  uuid,
  uuid,
  numeric,
  public.payment_method
)
to authenticated;

commit;

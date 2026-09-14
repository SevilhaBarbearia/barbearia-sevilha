-- Dados opcionais para desenvolvimento. Eu nunca executo este arquivo em produção.

insert into public.services (barbershop_id, name, description, price, duration_minutes, is_active)
select b.id, item.name, item.description, item.price, item.duration, true
from public.barbershops b
cross join (values
  ('Corte masculino', 'Corte completo com acabamento.', 40.00::numeric, 45),
  ('Barba', 'Modelagem e acabamento de barba.', 30.00::numeric, 30),
  ('Corte + barba', 'Pacote completo para cabelo e barba.', 65.00::numeric, 75)
) as item(name, description, price, duration)
where b.slug = 'sevilha'
  and not exists (select 1 from public.services s where s.barbershop_id = b.id and s.name = item.name);

insert into public.barbers (barbershop_id, name, bio, is_active)
select b.id, 'Barbeiro Principal', 'Especialista em cortes modernos e tradicionais.', true
from public.barbershops b
where b.slug = 'sevilha'
  and not exists (select 1 from public.barbers br where br.barbershop_id = b.id and br.name = 'Barbeiro Principal');

insert into public.barber_services (barbershop_id, barber_id, service_id, is_active)
select b.id, barber.id, service.id, true
from public.barbershops b
join public.barbers barber on barber.barbershop_id = b.id and barber.name = 'Barbeiro Principal'
join public.services service on service.barbershop_id = b.id
where b.slug = 'sevilha'
on conflict (barber_id, service_id) do update set is_active = true;

insert into public.business_hours (barbershop_id, barber_id, day_of_week, start_time, end_time, break_start, break_end, is_active)
select b.id, barber.id, day.value, '09:00', '18:00', '12:00', '13:00', true
from public.barbershops b
join public.barbers barber on barber.barbershop_id = b.id and barber.name = 'Barbeiro Principal'
cross join (values (1),(2),(3),(4),(5),(6)) as day(value)
where b.slug = 'sevilha'
  and not exists (
    select 1 from public.business_hours h
    where h.barbershop_id = b.id and h.barber_id = barber.id and h.day_of_week = day.value
  );

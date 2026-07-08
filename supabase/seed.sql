-- Dados iniciais opcionais para desenvolvimento.
insert into public.services (name, description, price, duration_minutes, is_active)
values
  ('Corte masculino', 'Corte completo com acabamento.', 40.00, 45, true),
  ('Barba', 'Modelagem e acabamento de barba.', 30.00, 30, true),
  ('Corte + barba', 'Pacote completo para cabelo e barba.', 65.00, 75, true)
on conflict do nothing;

insert into public.barbers (name, bio, is_active)
values
  ('Barbeiro Principal', 'Especialista em cortes modernos e tradicionais.', true)
on conflict do nothing;

insert into public.barber_services (barber_id, service_id, is_active)
select b.id, s.id, true from public.barbers b cross join public.services s
on conflict do nothing;

insert into public.business_hours (barber_id, day_of_week, start_time, end_time, break_start, break_end, is_active)
select b.id, d.day, '09:00', '18:00', '12:00', '13:00', true
from public.barbers b
cross join (values (0),(1),(2),(3),(4),(5),(6)) as d(day)
on conflict do nothing;

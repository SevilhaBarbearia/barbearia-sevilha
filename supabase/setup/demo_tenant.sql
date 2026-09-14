-- Este arquivo é somente para staging/demonstração.
-- Eu não executo este setup em produção.

begin;

insert into public.organizations (name)
select 'Grupo Demonstração'
where not exists (
  select 1
  from public.organizations
  where name = 'Grupo Demonstração'
);

insert into public.barbershops (
  organization_id,
  name,
  slug,
  description,
  primary_color,
  secondary_color,
  timezone,
  is_active
)
select
  o.id,
  'Barbearia Modelo',
  'barbearia-modelo',
  'Cuidado, estilo e praticidade com agendamento online.',
  '#B8873F',
  '#000000',
  'America/Fortaleza',
  true
from public.organizations o
where
  o.name = 'Grupo Demonstração'
  and not exists (
    select 1
    from public.barbershops b
    where b.slug = 'barbearia-modelo'
  )
order by o.created_at
limit 1;

update public.barbershops
set
  name = 'Barbearia Modelo',
  description = 'Cuidado, estilo e praticidade com agendamento online.',
  primary_color = '#B8873F',
  secondary_color = '#000000',
  is_active = true
where slug = 'barbearia-modelo';

insert into public.business_settings (
  barbershop_id,
  business_name,
  description,
  address,
  phone,
  whatsapp,
  cancellation_limit_hours,
  booking_advance_days,
  primary_color,
  secondary_color
)
select
  b.id,
  'Barbearia Modelo',
  'Cuidado, estilo e praticidade com agendamento online.',
  'Rua Exemplo, 100 - Centro',
  '(83) 3000-0000',
  '(83) 90000-0000',
  4,
  30,
  '#B8873F',
  '#000000'
from public.barbershops b
where b.slug = 'barbearia-modelo'
on conflict (barbershop_id)
do update set
  business_name = excluded.business_name,
  description = excluded.description,
  address = excluded.address,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  cancellation_limit_hours = excluded.cancellation_limit_hours,
  booking_advance_days = excluded.booking_advance_days,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  updated_at = now();

insert into public.services (
  barbershop_id,
  name,
  description,
  price,
  duration_minutes,
  is_active
)
select
  b.id,
  item.name,
  item.description,
  item.price,
  item.duration,
  true
from public.barbershops b
cross join (
  values
    ('Corte', 'Corte masculino com acabamento.', 45.00::numeric, 45),
    ('Barba', 'Modelagem e acabamento completo.', 35.00::numeric, 30),
    ('Corte + barba', 'Experiência completa de cabelo e barba.', 70.00::numeric, 75)
) as item(name, description, price, duration)
where
  b.slug = 'barbearia-modelo'
  and not exists (
    select 1
    from public.services s
    where
      s.barbershop_id = b.id
      and s.name = item.name
  );

insert into public.barbers (
  barbershop_id,
  name,
  bio,
  is_active
)
select
  b.id,
  item.name,
  item.bio,
  true
from public.barbershops b
cross join (
  values
    ('Rafael', 'Especialista em cortes clássicos e modernos.'),
    ('Lucas', 'Foco em degradês, acabamento e barba.'),
    ('Diego', 'Atendimento personalizado e estilo masculino.')
) as item(name, bio)
where
  b.slug = 'barbearia-modelo'
  and not exists (
    select 1
    from public.barbers br
    where
      br.barbershop_id = b.id
      and br.name = item.name
  );

insert into public.barber_services (
  barbershop_id,
  barber_id,
  service_id,
  is_active
)
select
  b.id,
  barber.id,
  service.id,
  true
from public.barbershops b
join public.barbers barber
  on barber.barbershop_id = b.id
join public.services service
  on service.barbershop_id = b.id
where b.slug = 'barbearia-modelo'
on conflict (barber_id, service_id)
do update set
  is_active = true;

insert into public.business_hours (
  barbershop_id,
  barber_id,
  day_of_week,
  start_time,
  end_time,
  break_start,
  break_end,
  is_active
)
select
  b.id,
  barber.id,
  day.value,
  '09:00',
  '19:00',
  '12:00',
  '13:00',
  true
from public.barbershops b
join public.barbers barber
  on barber.barbershop_id = b.id
cross join (
  values
    (1),
    (2),
    (3),
    (4),
    (5),
    (6)
) as day(value)
where
  b.slug = 'barbearia-modelo'
  and not exists (
    select 1
    from public.business_hours h
    where
      h.barbershop_id = b.id
      and h.barber_id = barber.id
      and h.day_of_week = day.value
  );

commit;

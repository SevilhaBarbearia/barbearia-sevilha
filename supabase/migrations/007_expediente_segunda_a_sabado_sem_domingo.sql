-- 007_expediente_segunda_a_sabado_sem_domingo.sql
-- Ajuste operacional solicitado: ao cadastrar barbeiro, ele fica disponível de segunda a sábado.
-- Domingo não deve abrir horários por padrão.

-- Remove expediente de domingo criado por versões anteriores do projeto.
delete from public.business_hours
where day_of_week = 0;

-- Garante que todos os barbeiros existentes tenham expediente interno de segunda a sábado.
with base as (
  select distinct on (b.id)
    b.id as barber_id,
    coalesce(bh.start_time, '09:00'::time) as start_time,
    coalesce(bh.end_time, '18:00'::time) as end_time,
    coalesce(bh.break_start, '12:00'::time) as break_start,
    coalesce(bh.break_end, '13:00'::time) as break_end,
    coalesce(bh.is_active, true) as is_active
  from public.barbers b
  left join public.business_hours bh on bh.barber_id = b.id and bh.day_of_week between 1 and 6
  order by b.id, bh.day_of_week nulls last
), dias as (
  select generate_series(1, 6) as day_of_week
)
insert into public.business_hours (barber_id, day_of_week, start_time, end_time, break_start, break_end, is_active)
select
  base.barber_id,
  dias.day_of_week,
  base.start_time,
  base.end_time,
  base.break_start,
  base.break_end,
  base.is_active
from base
cross join dias
where not exists (
  select 1
  from public.business_hours bh
  where bh.barber_id = base.barber_id
    and bh.day_of_week = dias.day_of_week
);

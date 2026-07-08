-- 006_expediente_padrao_todos_os_dias.sql
-- Garante que barbeiros existentes tenham expediente em todos os dias sem exibir um card por dia na interface.
-- Usa o primeiro expediente já cadastrado do barbeiro como base; se não existir, aplica 09:00-18:00 com pausa 12:00-13:00.

with base as (
  select distinct on (b.id)
    b.id as barber_id,
    coalesce(bh.start_time, '09:00'::time) as start_time,
    coalesce(bh.end_time, '18:00'::time) as end_time,
    coalesce(bh.break_start, '12:00'::time) as break_start,
    coalesce(bh.break_end, '13:00'::time) as break_end,
    coalesce(bh.is_active, true) as is_active
  from public.barbers b
  left join public.business_hours bh on bh.barber_id = b.id
  order by b.id, bh.day_of_week nulls last
), dias as (
  select generate_series(0, 6) as day_of_week
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

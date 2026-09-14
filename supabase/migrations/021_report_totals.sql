begin;
-- Eu agrego no banco para os totais não dependerem do limite de linhas da API.
create or replace function public.revenue_summary(tenant uuid)
returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('total',coalesce(sum(amount),0),'methods',coalesce(jsonb_object_agg(method,amount),'{}'))
 from (select method,sum(amount) amount from public.presencial_payments where barbershop_id=tenant and status='paid' group by method) grouped;
$$;
create or replace function public.feedback_summary(tenant uuid)
returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('count',count(*),'average',coalesce(avg(rating),0),
 'recent_count',count(*) filter(where submitted_at>=now()-interval '30 days'),
 'recent_average',coalesce(avg(rating) filter(where submitted_at>=now()-interval '30 days'),0),
 'attention',count(*) filter(where rating<=2),
 'barbers',(select coalesce(jsonb_agg(x),'[]') from (
 select f.barber_id,b.name,avg(f.rating) average,count(*) count from public.appointment_feedback f join public.barbers b on b.id=f.barber_id
 where f.barbershop_id=tenant and f.submitted_at is not null group by f.barber_id,b.name) x))
 from public.appointment_feedback where barbershop_id=tenant and submitted_at is not null;
$$;
revoke all on function public.revenue_summary(uuid),public.feedback_summary(uuid) from public;
grant execute on function public.revenue_summary(uuid),public.feedback_summary(uuid) to authenticated;
commit;

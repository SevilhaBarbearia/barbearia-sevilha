begin;
alter table public.outbound_notifications add column first_attempt_at timestamptz;
create or replace function public.claim_notifications(batch_size integer default 10)
returns setof public.outbound_notifications language plpgsql security definer set search_path=public as $$
begin
 update public.outbound_notifications set status='canceled',payload='{}'
 where status in ('pending','failed','processing') and exists (
 select 1 from public.customers c where c.id=customer_id and not c.allow_email);
 return query
 with picked as (
 select n.id from public.outbound_notifications n
 where n.channel='email' and n.scheduled_at<=now() and n.attempts<5
 and (n.first_attempt_at is null or n.first_attempt_at>now()-interval '23 hours')
 and (n.status in ('pending','failed') or (n.status='processing' and n.updated_at<now()-interval '10 minutes'))
 order by n.scheduled_at for update skip locked limit greatest(1,least(batch_size,10)))
 update public.outbound_notifications n set status='processing', attempts=n.attempts+1,
 first_attempt_at=coalesce(n.first_attempt_at,now()),updated_at=now()
 from picked where n.id=picked.id returning n.*;
end; $$;
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
commit;

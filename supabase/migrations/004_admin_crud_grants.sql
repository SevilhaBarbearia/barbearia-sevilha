-- 004_admin_crud_grants.sql
-- Permissões necessárias para o painel administrativo cadastrar, editar e desativar dados.
-- As policies RLS continuam limitando essas ações apenas para usuários com role = 'admin'.

grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.barbers to authenticated;
grant select, insert, update, delete on public.barber_services to authenticated;
grant select, insert, update, delete on public.business_hours to authenticated;
grant select, insert, update, delete on public.blocked_slots to authenticated;
grant select, insert, update on public.business_settings to authenticated;

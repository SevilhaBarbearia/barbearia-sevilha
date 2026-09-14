-- 012_storage_multitenant.sql
-- Eu separo os arquivos pelo UUID da barbearia para a policy validar o tenant novamente.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbershop-public',
  'barbershop-public',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists barbershop_public_files_read on storage.objects;
create policy barbershop_public_files_read on storage.objects
for select using (bucket_id = 'barbershop-public');

drop policy if exists barbershop_managers_insert_files on storage.objects;
create policy barbershop_managers_insert_files on storage.objects
for insert to authenticated with check (
  bucket_id = 'barbershop-public'
  and public.can_manage_barbershop(((storage.foldername(name))[1])::uuid)
);

drop policy if exists barbershop_managers_update_files on storage.objects;
create policy barbershop_managers_update_files on storage.objects
for update to authenticated using (
  bucket_id = 'barbershop-public'
  and public.can_manage_barbershop(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'barbershop-public'
  and public.can_manage_barbershop(((storage.foldername(name))[1])::uuid)
);

drop policy if exists barbershop_managers_delete_files on storage.objects;
create policy barbershop_managers_delete_files on storage.objects
for delete to authenticated using (
  bucket_id = 'barbershop-public'
  and public.can_manage_barbershop(((storage.foldername(name))[1])::uuid)
);

commit;

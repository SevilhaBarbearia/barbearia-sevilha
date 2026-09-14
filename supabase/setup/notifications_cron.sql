-- Eu separo a ativação do cron das migrations porque o envio depende de credenciais do ambiente.
-- Antes de executar, crie no Vault os secrets barbershop_project_url e barbershop_service_role_key.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
 if not exists(select 1 from vault.secrets where name='barbershop_project_url')
 or not exists(select 1 from vault.secrets where name='barbershop_service_role_key') then
 raise exception 'Cadastre os dois secrets no Vault antes de ativar o cron.';
 end if;
end; $$;

select cron.schedule(
 'process-barbershop-notifications',
 '*/5 * * * *',
 $job$
 select net.http_post(
 url := (select decrypted_secret from vault.decrypted_secrets where name='barbershop_project_url') || '/functions/v1/process-notifications',
 headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
 (select decrypted_secret from vault.decrypted_secrets where name='barbershop_service_role_key')),
 body := '{}'::jsonb,
 timeout_milliseconds := 120000
 );
 $job$
);

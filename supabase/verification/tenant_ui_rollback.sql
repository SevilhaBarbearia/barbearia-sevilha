-- tenant_ui_rollback.sql
--
-- Validação não destrutiva do rollback individual.
-- A transação altera temporariamente SOMENTE a ExclusiveMen e executa
-- ROLLBACK no final. Se a Sevilha mudar junto, o script gera erro.

begin;

do $$
declare
  sevilha_before text;
  exclusive_before text;
  target_version text;
begin
  select ui_version
  into sevilha_before
  from public.barbershops
  where slug = 'sevilha';

  select ui_version
  into exclusive_before
  from public.barbershops
  where slug = 'exclusivemen';

  if sevilha_before is null then
    raise exception 'SEVILHA_NOT_FOUND';
  end if;

  if exclusive_before is null then
    raise exception 'EXCLUSIVEMEN_NOT_FOUND';
  end if;

  target_version := case
    when exclusive_before = 'legacy' then 'warm-premium'
    else 'legacy'
  end;

  update public.barbershops
  set ui_version = target_version
  where slug = 'exclusivemen';

  if (
    select ui_version
    from public.barbershops
    where slug = 'sevilha'
  ) <> sevilha_before then
    raise exception 'TENANT_ISOLATION_FAILED: Sevilha foi alterada.';
  end if;

  if (
    select ui_version
    from public.barbershops
    where slug = 'exclusivemen'
  ) <> target_version then
    raise exception 'TENANT_ROLLBACK_FAILED: ExclusiveMen não mudou isoladamente.';
  end if;

  raise notice
    'PASS: ExclusiveMen mudou isoladamente de % para %, Sevilha permaneceu em %.',
    exclusive_before,
    target_version,
    sevilha_before;
end;
$$;

rollback;

-- Confirma que o teste não deixou alteração persistida.
select slug, ui_version
from public.barbershops
where slug in ('sevilha', 'exclusivemen')
order by slug;

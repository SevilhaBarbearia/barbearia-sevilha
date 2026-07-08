-- Atualiza o nome público da barbearia em bancos já criados.
-- Não altera estrutura, regras de negócio, RLS ou dados de agendamentos.
update public.business_settings
set business_name = 'Sevilha Barbearia',
    updated_at = now()
where business_name in ('Barbearia Premium', 'BarbeariaPro', 'Barbearia Pro')
   or business_name is null;

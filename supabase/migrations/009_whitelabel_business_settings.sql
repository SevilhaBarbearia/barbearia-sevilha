-- Adiciona as cores de marca (whitelabel) na tabela business_settings.
-- Não altera dados existentes: os campos ficam nulos até a barbearia
-- configurar sua própria cor, e nesse caso o app usa o padrão da Sevilha
-- (ver src/lib/theme/paleta-marca.ts).
alter table public.business_settings
  add column if not exists primary_color text,
  add column if not exists primary_color_dark text;

alter table public.business_settings
  add constraint business_settings_primary_color_hex_check
    check (primary_color is null or primary_color ~* '^#[0-9a-f]{6}$'),
  add constraint business_settings_primary_color_dark_hex_check
    check (primary_color_dark is null or primary_color_dark ~* '^#[0-9a-f]{6}$');

comment on column public.business_settings.primary_color is
  'Cor principal de marca do tenant (whitelabel), em hexadecimal (#rrggbb). Nula = usa o padrão do produto.';
comment on column public.business_settings.primary_color_dark is
  'Variante escura da cor de marca, usada em hover/ênfase. Nula = calculada automaticamente a partir da cor principal.';

-- As policies de RLS e os grants já existentes em 002_rls.sql e
-- 004_admin_crud_grants.sql cobrem a tabela inteira (não por coluna), então
-- as novas colunas já herdam as mesmas regras: leitura pública, escrita só
-- para admin.

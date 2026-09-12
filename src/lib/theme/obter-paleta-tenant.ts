import { createClient } from '@/lib/supabase/server';
import { gerarPaletaMarca, type PaletaMarca } from './paleta-marca';

// Busco as cores de marca configuradas pela barbearia em business_settings.
//
// O projeto ainda opera no modelo single-tenant (uma linha só nessa tabela),
// então por enquanto pego sempre essa única linha. Quando o multi-tenant for
// implementado, essa é a função a ajustar: troque o .maybeSingle() por um
// filtro .eq('tenant_id', tenantId) recebido por parâmetro.
export async function obterPaletaDoTenant(): Promise<PaletaMarca> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('business_settings')
      .select('primary_color, primary_color_dark')
      .limit(1)
      .maybeSingle();

    return gerarPaletaMarca(data?.primary_color, data?.primary_color_dark);
  } catch {
    // Se o Supabase estiver fora do ar ou a coluna ainda não existir (antes
    // da migration 009 rodar), caio no padrão da Sevilha em vez de derrubar
    // a aplicação inteira por causa de uma cor.
    return gerarPaletaMarca(null, null);
  }
}

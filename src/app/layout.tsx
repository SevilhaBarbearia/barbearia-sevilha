import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { obterPaletaDoTenant } from '@/lib/theme/obter-paleta-tenant';

export const metadata: Metadata = {
  title: 'Sevilha Barbearia',
  description: 'Sistema moderno de agendamento da Sevilha Barbearia.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const paletaMarca = await obterPaletaDoTenant();

  // Sobrescrevo aqui as variáveis --color-brand-* (definidas em @theme no
  // globals.css) com os tons calculados para o tenant atual. Como essas
  // variáveis já são a fonte usada pelas classes brand-* do Tailwind, isso é
  // suficiente para trocar a cor de marca em todo o app sem tocar em nenhum
  // componente — cada nova barbearia recebe sua própria identidade visual.
  const variaveisDeCor = Object.entries(paletaMarca)
    .map(([tom, cor]) => `--color-brand-${tom}: ${cor};`)
    .join(' ');

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${variaveisDeCor} }` }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

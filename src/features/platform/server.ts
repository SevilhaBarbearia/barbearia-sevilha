import { notFound, redirect } from "next/navigation";

import { obterPlatformAdminAtual } from "@/lib/auth/platform-permissoes";

/**
 * Eu mantenho a autorizacao da plataforma separada da autorizacao do tenant.
 *
 * Esta funcao NAO transforma o Platform Admin em owner/manager e nao concede
 * acesso ao painel operacional de nenhuma barbearia.
 *
 * O login e independente: usuario sem sessao e enviado para
 * /plataforma/login, nunca para /admin/login.
 */
export async function requirePlatformAdmin() {
  const admin = await obterPlatformAdminAtual();

  if (!admin) {
    redirect(
      `/plataforma/login?next=${encodeURIComponent("/plataforma")}`,
    );
  }

  /*
   * Defesa em profundidade: obterPlatformAdminAtual ja verifica
   * is_platform_admin. Reforcamos aqui para nao depender de um unico
   * ponto de checagem caso a funcao mude no futuro.
   */
  if (!admin.profile.is_platform_admin) {
    notFound();
  }

  return admin;
}

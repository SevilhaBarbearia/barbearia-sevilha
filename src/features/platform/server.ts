import {
  notFound,
  redirect,
} from "next/navigation";

import { obterAdministradorAtual } from "@/lib/auth/permissoes";

/**
 * Eu mantenho a autorização da plataforma separada da autorização do tenant.
 *
 * Esta função NÃO transforma o Platform Admin em owner/manager e não concede
 * acesso ao painel operacional de nenhuma barbearia.
 */
export async function requirePlatformAdmin() {
  const admin =
    await obterAdministradorAtual();

  if (!admin) {
    redirect(
      `/admin/login?next=${encodeURIComponent(
        "/plataforma",
      )}`,
    );
  }

  if (
    !admin.profile
      .is_platform_admin
  ) {
    notFound();
  }

  return admin;
}

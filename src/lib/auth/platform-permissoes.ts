import { createClient } from "@/lib/supabase/server";
import { obterUsuarioAtual } from "./permissoes";
import { permitePlataforma } from "./platform-policy";

/**
 * Autorizacao exclusiva do Platform Admin.
 *
 * Diferente de obterAdministradorAtual():
 * - NAO exige role = "admin";
 * - NAO exige membership de tenant;
 * - NAO redireciona para /admin/login.
 *
 * Ele confirma:
 * 1. sessao Supabase valida;
 * 2. atividade humana nos ultimos 30 minutos (check_current_app_session);
 * 3. profile.is_platform_admin === true;
 * 4. profile.is_active === true;
 * 5. autenticacao por senha (amr com method "password").
 */
export async function obterPlatformAdminAtual() {
  const { user, profile } = await obterUsuarioAtual();

  if (!user || !profile) {
    return null;
  }

  if (profile.is_platform_admin !== true) {
    return null;
  }

  if (!profile.is_active) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !permitePlataforma(user.id, profile, data?.claims)) {
    return null;
  }

  return { user, profile };
}

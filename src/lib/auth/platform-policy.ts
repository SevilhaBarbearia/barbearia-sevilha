// Politica de autorizacao exclusiva do Platform Admin.
//
// O Platform Admin NAO se confunde com o admin de tenant:
// - NAO exige role = "admin" (identidade separada);
// - exige is_platform_admin = true e is_active = true;
// - exige sessao de senha (amr com method "password"), porque a
//   entrada e feita em /plataforma/login.
//
// Recebe somente claims ja verificadas por supabase.auth.getClaims().
export function permitePlataforma(
  userId: string,
  profile:
    | {
        id: string;
        is_platform_admin?: boolean | null;
        is_active: boolean;
      }
    | null,
  claims: { sub?: string; amr?: unknown } | null | undefined,
) {
  return Boolean(
    profile?.id === userId &&
      profile.is_platform_admin === true &&
      profile.is_active &&
      claims?.sub === userId &&
      Array.isArray(claims.amr) &&
      claims.amr.some(
        (entry: unknown) =>
          typeof entry === "object" &&
          entry !== null &&
          "method" in entry &&
          entry.method === "password",
      ),
  );
}

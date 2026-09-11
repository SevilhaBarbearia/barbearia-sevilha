// Recebe somente claims já verificadas por supabase.auth.getClaims().
export function permiteAdministracao(
  userId: string,
  profile: { id: string; role: string; is_active: boolean } | null,
  claims: { sub?: string; amr?: unknown } | null | undefined
) {
  return Boolean(
    profile?.id === userId && profile.role === 'admin' && profile.is_active &&
    claims?.sub === userId && Array.isArray(claims.amr) &&
    claims.amr.some((entry: unknown) =>
      typeof entry === 'object' && entry !== null &&
      'method' in entry && entry.method === 'password'
    )
  );
}

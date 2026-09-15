export type TenantUiVersion =
  | "legacy"
  | "warm-premium";

/**
 * O Warm Premium agora é a interface padrão do produto.
 *
 * Durante o desenvolvimento usamos rollout por ambiente/branch para validar
 * sem afetar produção. Depois da promoção para a main, manter essa dependência
 * externa só aumentaria a complexidade operacional.
 *
 * Em caso de rollback emergencial, ainda é possível forçar a interface antiga
 * com UI_FORCE_LEGACY=true e um novo deploy, sem alterar dados ou tenants.
 */
export async function getTenantUiVersion(
  _slug: string,
): Promise<TenantUiVersion> {
  return process.env.UI_FORCE_LEGACY === "true"
    ? "legacy"
    : "warm-premium";
}

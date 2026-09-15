import { get } from "@vercel/global-config";

export type TenantUiVersion = "legacy" | "warm-premium";

type RolloutEnvironment =
  | "development"
  | "preview"
  | "production";

type RolloutConfig = Partial<
  Record<RolloutEnvironment, unknown>
>;

const ROLLOUT_CONFIG_KEY = "warmPremiumUiTenants";

function normalizeTenantList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getRolloutEnvironment(): RolloutEnvironment {
  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "development";
}

function getTenantsForEnvironment(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return normalizeTenantList(value);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const environment = getRolloutEnvironment();
  const config = value as RolloutConfig;

  return normalizeTenantList(
    config[environment],
  );
}

function getLocalOverride(): string[] {
  if (
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV === "production"
  ) {
    return [];
  }

  return normalizeTenantList(
    process.env.UI_ROLLOUT_LOCAL_TENANTS?.split(",") ?? [],
  );
}

async function readRolloutTenantsFromGlobalConfig(): Promise<string[]> {
  try {
    /*
     * Eu deixo o SDK oficial resolver a conexão com o Global Config.
     * Não verifico process.env.GLOBAL_CONFIG antes da leitura porque essa
     * variável é detalhe da integração da Vercel e pode não estar exposta
     * da mesma forma em todos os runtimes/deployments.
     */
    const value = await get(ROLLOUT_CONFIG_KEY);

    return getTenantsForEnvironment(value);
  } catch {
    // Eu falho fechado: qualquer problema mantém a interface legada.
    return [];
  }
}

export async function getTenantUiVersion(
  slug: string,
): Promise<TenantUiVersion> {
  const normalizedSlug = slug
    .trim()
    .toLowerCase();

  const localOverride = getLocalOverride();

  if (
    localOverride.includes("*") ||
    localOverride.includes(normalizedSlug)
  ) {
    return "warm-premium";
  }

  const enabledTenants =
    await readRolloutTenantsFromGlobalConfig();

  const enabled =
    enabledTenants.includes("*") ||
    enabledTenants.includes(normalizedSlug);

  return enabled
    ? "warm-premium"
    : "legacy";
}

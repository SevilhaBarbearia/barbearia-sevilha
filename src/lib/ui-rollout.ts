import { get } from "@vercel/global-config";

export type TenantUiVersion =
  | "legacy"
  | "warm-premium";

type RolloutEnvironment =
  | "development"
  | "preview"
  | "production";

type RolloutConfig = Partial<
  Record<
    RolloutEnvironment,
    unknown
  >
>;

const ROLLOUT_CONFIG_KEY =
  "warmPremiumUiTenants";

function normalizeTenantList(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item ===
        "string",
    )
    .map((item) =>
      item
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

function normalizeEnvironment(
  value:
    | string
    | undefined,
): RolloutEnvironment | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase();

  if (
    normalized ===
      "production" ||
    normalized ===
      "preview" ||
    normalized ===
      "development"
  ) {
    return normalized;
  }

  return null;
}

function getRolloutEnvironment(): RolloutEnvironment | null {
  /*
   * Eu uso mais de uma fonte porque a Vercel
   * pode expor o ambiente pelo target padrão
   * ou pelas variáveis do framework.
   */
  const candidates = [
    process.env
      .VERCEL_TARGET_ENV,

    process.env
      .VERCEL_ENV,

    process.env
      .NEXT_PUBLIC_VERCEL_TARGET_ENV,

    process.env
      .NEXT_PUBLIC_VERCEL_ENV,
  ];

  for (
    const candidate
    of candidates
  ) {
    const environment =
      normalizeEnvironment(
        candidate,
      );

    if (environment) {
      return environment;
    }
  }

  /*
   * A URL específica de branch existe apenas
   * nos deployments de Preview.
   */
  const branchUrl =
    process.env
      .VERCEL_BRANCH_URL ??
    process.env
      .NEXT_PUBLIC_VERCEL_BRANCH_URL;

  if (branchUrl) {
    return "preview";
  }

  /*
   * Se tenho URL do deployment e URL oficial
   * de produção, consigo diferenciar produção
   * de Preview sem depender só do VERCEL_ENV.
   */
  const deploymentUrl =
    process.env.VERCEL_URL ??
    process.env
      .NEXT_PUBLIC_VERCEL_URL;

  const productionUrl =
    process.env
      .VERCEL_PROJECT_PRODUCTION_URL ??
    process.env
      .NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

  if (
    deploymentUrl &&
    productionUrl
  ) {
    return deploymentUrl ===
      productionUrl
      ? "production"
      : "preview";
  }

  /*
   * Fora da Vercel eu considero desenvolvimento.
   *
   * Em um runtime de produção desconhecido eu
   * NÃO assumo Preview: prefiro falhar fechado.
   */
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return "development";
  }

  return null;
}

function getTenantsForEnvironment(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return normalizeTenantList(
      value,
    );
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return [];
  }

  const environment =
    getRolloutEnvironment();

  /*
   * Eu não tento adivinhar o ambiente quando
   * estou em runtime de produção.
   *
   * Isso impede que um erro de configuração
   * habilite a UI nova acidentalmente.
   */
  if (!environment) {
    return [];
  }

  const config =
    value as RolloutConfig;

  return normalizeTenantList(
    config[environment],
  );
}

function getLocalOverride(): string[] {
  if (
    process.env.VERCEL_ENV ||
    process.env
      .VERCEL_TARGET_ENV ||
    process.env.NODE_ENV ===
      "production"
  ) {
    return [];
  }

  return normalizeTenantList(
    process.env
      .UI_ROLLOUT_LOCAL_TENANTS?.split(
        ",",
      ) ?? [],
  );
}

async function readRolloutTenantsFromGlobalConfig(): Promise<
  string[]
> {
  try {
    /*
     * O SDK oficial resolve a conexão com
     * o Global Config da Vercel.
     */
    const value =
      await get(
        ROLLOUT_CONFIG_KEY,
      );

    return getTenantsForEnvironment(
      value,
    );
  } catch {
    /*
     * Eu falho fechado.
     * Nenhuma falha externa ativa a UI nova.
     */
    return [];
  }
}

export async function getTenantUiVersion(
  slug: string,
): Promise<TenantUiVersion> {
  const normalizedSlug =
    slug
      .trim()
      .toLowerCase();

  const localOverride =
    getLocalOverride();

  if (
    localOverride.includes(
      "*",
    ) ||
    localOverride.includes(
      normalizedSlug,
    )
  ) {
    return "warm-premium";
  }

  const enabledTenants =
    await readRolloutTenantsFromGlobalConfig();

  const enabled =
    enabledTenants.includes(
      "*",
    ) ||
    enabledTenants.includes(
      normalizedSlug,
    );

  return enabled
    ? "warm-premium"
    : "legacy";
}
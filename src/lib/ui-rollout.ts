export type TenantUiVersion = "legacy" | "warm-premium";
type RolloutEnvironment = "development" | "preview" | "production";

const ROLLOUT_CONFIG_KEY = "warmPremiumUiTenants";

function normalizeTenantList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getRolloutEnvironment(): RolloutEnvironment {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

function getTenantsForEnvironment(value: unknown) {
  if (Array.isArray(value)) return normalizeTenantList(value);
  if (!value || typeof value !== "object") return [];

  const environment = getRolloutEnvironment();
  const config = value as Partial<Record<RolloutEnvironment, unknown>>;

  return normalizeTenantList(config[environment]);
}

function getLocalOverride() {
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
    return [];
  }

  return normalizeTenantList(
    process.env.UI_ROLLOUT_LOCAL_TENANTS?.split(",") ?? [],
  );
}

function buildGlobalConfigItemUrl(connectionString: string, key: string) {
  const url = new URL(connectionString);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/item/${encodeURIComponent(key)}`;
  return url;
}

async function readRolloutTenantsFromGlobalConfig() {
  const connectionString = process.env.EDGE_CONFIG;
  if (!connectionString) return [];

  try {
    const response = await fetch(
      buildGlobalConfigItemUrl(connectionString, ROLLOUT_CONFIG_KEY),
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) return [];

    return getTenantsForEnvironment(await response.json());
  } catch {
    // Eu falho fechado: se a configuração remota cair, mantenho a UI legada.
    return [];
  }
}

export async function getTenantUiVersion(
  slug: string,
): Promise<TenantUiVersion> {
  const normalizedSlug = slug.trim().toLowerCase();
  const localOverride = getLocalOverride();

  if (
    localOverride.includes("*") ||
    localOverride.includes(normalizedSlug)
  ) {
    return "warm-premium";
  }

  const enabledTenants = await readRolloutTenantsFromGlobalConfig();
  const enabled =
    enabledTenants.includes("*") || enabledTenants.includes(normalizedSlug);

  return enabled ? "warm-premium" : "legacy";
}
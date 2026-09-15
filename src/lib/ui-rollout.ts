import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type TenantUiVersion =
  | "legacy"
  | "warm-premium";

const DEFAULT_UI_VERSION: TenantUiVersion =
  "warm-premium";

function normalizeUiVersion(
  value: string | null | undefined,
): TenantUiVersion | null {
  if (
    value === "legacy" ||
    value === "warm-premium"
  ) {
    return value;
  }

  return null;
}

/*
 * Eu leio a versão visual diretamente do tenant.
 *
 * O cache() do React evita repetir a mesma consulta dentro da mesma
 * renderização quando layout e página pedem a versão do mesmo slug.
 * Não é um cache persistente entre deploys/requests, então um rollback
 * individual no banco passa a valer sem precisar publicar código novo.
 */
const readTenantUiVersion = cache(
  async (
    slug: string,
  ): Promise<TenantUiVersion> => {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("barbershops")
      .select("ui_version")
      .eq(
        "slug",
        slug,
      )
      .eq("is_active", true)
      .maybeSingle<{
        ui_version:
          | string
          | null;
      }>();

    if (error) {
      console.error(
        "[ui-rollout:tenant-version]",
        error.code ??
          "UNKNOWN",
        error.message,
      );

      /*
       * Eu falho fechado para o visual legado se a leitura da flag
       * individual falhar. Regras de negócio e dados continuam intactos.
       */
      return "legacy";
    }

    return (
      normalizeUiVersion(
        data?.ui_version,
      ) ??
      DEFAULT_UI_VERSION
    );
  },
);

/**
 * Ordem de decisão:
 *
 * 1. UI_FORCE_LEGACY=true continua sendo o freio de emergência GLOBAL.
 * 2. Fora da emergência, cada tenant usa sua própria coluna ui_version.
 *
 * Dessa forma um tenant novo pode voltar para legacy sem afetar os tenants
 * que já estão estáveis em Warm Premium.
 */
export async function getTenantUiVersion(
  slug: string,
): Promise<TenantUiVersion> {
  if (
    process.env
      .UI_FORCE_LEGACY ===
    "true"
  ) {
    return "legacy";
  }

  const normalizedSlug =
    slug
      .trim()
      .toLowerCase();

  if (!normalizedSlug) {
    return "legacy";
  }

  return readTenantUiVersion(
    normalizedSlug,
  );
}

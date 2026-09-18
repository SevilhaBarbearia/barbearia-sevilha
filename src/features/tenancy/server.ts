import {
  notFound,
  redirect,
} from "next/navigation";

import { obterAdministradorAtual } from "@/lib/auth/permissoes";
import type {
  Barbershop,
  MembershipRole,
} from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

const slugPattern =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(
  value: string,
) {
  const slug =
    value.trim().toLowerCase();

  return slugPattern.test(slug)
    ? slug
    : null;
}

export async function getBarbershopBySlug(
  value: string,
) {
  const slug =
    normalizeSlug(value);

  if (!slug) return null;

  const supabase =
    await createClient();

  const { data } =
    await supabase
      .from("barbershops")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .is("archived_at", null)
      .maybeSingle<Barbershop>();

  return data;
}

export async function requireBarbershop(
  value: string,
) {
  const barbershop =
    await getBarbershopBySlug(
      value,
    );

  if (!barbershop) {
    notFound();
  }

  return barbershop;
}

export async function requireBarbershopManager(
  value: string,
) {
  const barbershop =
    await requireBarbershop(
      value,
    );

  const admin =
    await obterAdministradorAtual();

  if (!admin) {
    redirect(
      `/admin/login?next=${encodeURIComponent(
        `/admin/${barbershop.slug}`,
      )}`,
    );
  }

  const supabase =
    await createClient();

  /*
   * Não existe mais exceção para is_platform_admin.
   *
   * Um usuário só administra o tenant se possuir membership ativa
   * owner/manager naquele barbershop_id.
   */
  const { data: membership } =
    await supabase
      .from(
        "barbershop_members",
      )
      .select("role")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "profile_id",
        admin.user.id,
      )
      .eq("is_active", true)
      .in(
        "role",
        ["owner", "manager"],
      )
      .maybeSingle<{
        role: MembershipRole;
      }>();

  /*
   * Eu retorno 404 para não revelar a existência de outro tenant.
   */
  if (!membership) {
    notFound();
  }

  return {
    ...admin,
    barbershop,
    membershipRole:
      membership.role,
  };
}

export async function listManagedBarbershops() {
  const admin =
    await obterAdministradorAtual();

  if (!admin) {
    redirect("/admin/login");
  }

  const supabase =
    await createClient();

  /*
   * Platform Admin não recebe mais uma lista global por esta função.
   * Esta função representa exclusivamente tenants administrados
   * por membership owner/manager.
   */
  const { data } =
    await supabase
      .from(
        "barbershop_members",
      )
      .select(
        "barbershops(*)",
      )
      .eq(
        "profile_id",
        admin.user.id,
      )
      .eq("is_active", true)
      .in(
        "role",
        ["owner", "manager"],
      );

  return (data ?? [])
    .map(
      (item) =>
        item.barbershops as unknown as
          | Barbershop
          | null,
    )
    .filter(
      (
        item,
      ): item is Barbershop =>
        Boolean(
          item?.is_active &&
            !item.archived_at,
        ),
    );
}

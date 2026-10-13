"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da barbearia (mínimo 2 caracteres).")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug inválido. Use apenas letras minúsculas, números e hífens.",
    ),
  owner_email: z.string().email("Informe um e-mail válido."),
});

export type CreateBarbershopState =
  | { ok: true; mensagem: string }
  | { ok: false; mensagem: string; campo?: string };

export async function createBarbershop(
  _prev: CreateBarbershopState | null,
  formData: FormData,
): Promise<CreateBarbershopState> {
  await requirePlatformAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const campo = first?.path?.[0];
    return {
      ok: false,
      mensagem: first?.message ?? "Dados inválidos.",
      campo: typeof campo === "string" ? campo : undefined,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_barbershop_with_owner", {
    barbershop_name: parsed.data.name,
    barbershop_slug: parsed.data.slug,
    owner_email: parsed.data.owner_email,
    existing_organization_id: null,
  });

  if (error?.message.includes("OWNER_NOT_FOUND")) {
    return {
      ok: false,
      mensagem:
        "Crie primeiro a conta do proprietário no Supabase Auth, com e-mail e senha.",
      campo: "owner_email",
    };
  }
  if (error?.message.includes("OWNER_PLATFORM_ADMIN_CONFLICT")) {
    return {
      ok: false,
      mensagem:
        "A conta do Platform Admin não pode ser usada como proprietário de uma barbearia.",
      campo: "owner_email",
    };
  }
  if (error?.message.includes("INVALID_DATA")) {
    return {
      ok: false,
      mensagem:
        "Verifique nome e slug. O slug não pode usar palavras reservadas (admin, api, auth, plataforma, login, reservar, cliente).",
      campo: "slug",
    };
  }
  if (error) {
    return {
      ok: false,
      mensagem:
        "Não foi possível criar a barbearia. Verifique os dados, o proprietário e se o slug já existe.",
    };
  }

  revalidatePath("/plataforma");
  return { ok: true, mensagem: "Barbearia criada com sucesso." };
}

/* ── Novo fluxo: cria tenant pendente + gera link de convite ── */
import { createAdminClient } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da barbearia (mínimo 2 caracteres).")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug inválido. Use apenas letras minúsculas, números e hífens.",
    ),
  owner_email: z.string().email("Informe um e-mail válido."),
});

export type CreateTenantWithInviteState =
  | {
      ok: true;
      mensagem: string;
      slug: string;
      invite_url: string;
      admin_url: string;
      public_url: string;
    }
  | { ok: false; mensagem: string; campo?: string };

export async function createTenantWithInvite(
  _prev: CreateTenantWithInviteState | null,
  formData: FormData,
): Promise<CreateTenantWithInviteState> {
  await requirePlatformAdmin();

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const campo = first?.path?.[0];
    return {
      ok: false,
      mensagem: first?.message ?? "Dados inválidos.",
      campo: typeof campo === "string" ? campo : undefined,
    };
  }

  const supabase = await createClient();

  const { data: barbershopIdRaw, error: rpcError } = await supabase.rpc(
    "platform_create_tenant_pending_owner",
    {
      new_name: parsed.data.name,
      new_slug: parsed.data.slug,
      owner_email: parsed.data.owner_email,
    },
  );

  if (rpcError) {
    console.error("DEBUG: rpcError completo", rpcError);
    console.error("DEBUG: rpcError.code", rpcError.code);
    console.error("DEBUG: rpcError.message", rpcError.message);
    console.error("DEBUG: rpcError.details", rpcError.details);
    console.error("DEBUG: rpcError.hint", rpcError.hint);

    const m = rpcError.message.toUpperCase();
    if (m.includes("OWNER_ALREADY_HAS_TENANT"))
      return {
        ok: false,
        mensagem: "Este e-mail já é dono de outra barbearia.",
        campo: "owner_email",
      };
    if (m.includes("INVITE_ALREADY_PENDING"))
      return {
        ok: false,
        mensagem: "Já existe um convite pendente para este e-mail.",
        campo: "owner_email",
      };
    if (m.includes("INVALID_EMAIL"))
      return { ok: false, mensagem: "E-mail inválido.", campo: "owner_email" };
    if (m.includes("INVALID_DATA"))
      return { ok: false, mensagem: "Verifique nome e slug.", campo: "slug" };
    return { ok: false, mensagem: "Não foi possível criar a barbearia." };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(
    `/primeiro-acesso?slug=${parsed.data.slug}`,
  )}`;

  const admin = createAdminClient();

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email: parsed.data.owner_email,
      options: { redirectTo },
    });

  if (linkError) {
    const m = linkError.message.toLowerCase();
    if (m.includes("already") && m.includes("registered")) {
      return {
        ok: false,
        mensagem:
          "Este e-mail já tem conta no sistema. Gere um link de recuperação em vez de convite (em breve).",
        campo: "owner_email",
      };
    }
    return {
      ok: false,
      mensagem: `Barbearia criada, mas o convite falhou: ${linkError.message}`,
    };
  }

  revalidatePath("/plataforma");

  return {
    ok: true,
    mensagem: "Barbearia criada. Copie o link e envie ao dono.",
    slug: parsed.data.slug,
    invite_url: linkData.properties?.action_link ?? "",
    admin_url: `${siteUrl}/admin/${parsed.data.slug}`,
    public_url: `${siteUrl}/${parsed.data.slug}`,
  };
}

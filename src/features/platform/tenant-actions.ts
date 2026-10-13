"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/features/platform/server";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; mensagem: string }
  | { ok: false; mensagem: string };

function traduzErro(msg: string | undefined): string {
  if (!msg) return "Nao foi possivel concluir a operacao.";
  const m = msg.toUpperCase();
  if (m.includes("FORBIDDEN"))
    return "Voce nao tem permissao para essa acao.";
  if (m.includes("REASON_REQUIRED"))
    return "Informe um motivo com pelo menos 5 caracteres.";
  if (m.includes("INVALID_UI_VERSION")) return "Versao de UI invalida.";
  if (m.includes("INVALID_DURATION"))
    return "Duracao deve ficar entre 5 e 30 minutos.";
  if (m.includes("INVALID_SCOPE"))
    return "Selecione pelo menos um escopo valido.";
  if (m.includes("FEATURE_NOT_FOUND")) return "Feature nao encontrada.";
  if (m.includes("BARBERSHOP_NOT_FOUND")) return "Barbearia nao encontrada.";
  if (m.includes("PLAN_NOT_FOUND")) return "Plano nao encontrado.";
  if (m.includes("SUBSCRIPTION_NOT_FOUND")) return "Assinatura nao encontrada.";
  if (m.includes("SUPPORT_SESSION_NOT_FOUND"))
    return "Sessao de suporte nao encontrada.";
  return "Nao foi possivel concluir a operacao.";
}

function refresh(slug: string) {
  revalidatePath(`/plataforma/${slug}`);
  revalidatePath("/plataforma");
}

/* ── 1. Assinatura ──────────────────────────────────────── */
const assinaturaSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum([
    "trial",
    "active",
    "past_due",
    "suspended",
    "canceled",
    "expired",
  ]),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function alterarAssinatura(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = assinaturaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados invalidos." };

  if (
    (parsed.data.status === "suspended" ||
      parsed.data.status === "canceled") &&
    parsed.data.reason.trim().length < 5
  ) {
    return {
      ok: false,
      mensagem:
        "Motivo (minimo 5 caracteres) e obrigatorio para suspender ou cancelar.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_change_subscription", {
    target_barbershop_id: parsed.data.barbershop_id,
    target_plan_id: parsed.data.plan_id,
    target_status: parsed.data.status,
    target_reason: parsed.data.reason || null,
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Assinatura atualizada." };
}

/* ── 2. Feature override ─────────────────────────────────── */
const featureSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  feature_code: z.string().trim().min(1),
  enabled: z.enum(["true", "false"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function definirFeature(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const parsed = featureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_feature_override", {
    target_barbershop_id: parsed.data.barbershop_id,
    target_feature_code: parsed.data.feature_code,
    target_enabled: parsed.data.enabled === "true",
    target_reason: parsed.data.reason || null,
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Feature atualizada." };
}

const clearFeatureSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  feature_code: z.string().trim().min(1),
});

export async function limparOverrideFeature(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const parsed = clearFeatureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_clear_feature_override", {
    target_barbershop_id: parsed.data.barbershop_id,
    target_feature_code: parsed.data.feature_code,
    target_reason: null,
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Override removido." };
}

/* ── 3. UI version ───────────────────────────────────────── */
const uiSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  ui_version: z.enum(["legacy", "warm-premium"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function alterarUiVersion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const parsed = uiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_ui_version", {
    target_barbershop_id: parsed.data.barbershop_id,
    target_ui_version: parsed.data.ui_version,
    target_reason: parsed.data.reason || null,
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Versao visual atualizada." };
}

/* ── 4. Sessao de suporte ────────────────────────────────── */
const SCOPES = [
  "schedule_read",
  "customer_summary_read",
  "customer_contact_read",
  "payment_read",
  "settings_read",
] as const;

const supportSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
  ticket_reference: z.string().trim().max(120).optional().default(""),
  duration_minutes: z.coerce.number().int().min(5).max(30),
});

export async function abrirSessaoSuporte(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = supportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      mensagem:
        "Motivo (min 5), duracao (5-30 min) e escopos sao obrigatorios.",
    };
  }

  const scopes = formData
    .getAll("scopes")
    .map(String)
    .filter((s): s is (typeof SCOPES)[number] =>
      (SCOPES as readonly string[]).includes(s),
    );

  if (scopes.length === 0) {
    return { ok: false, mensagem: "Selecione pelo menos um escopo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_open_support_session", {
    target_barbershop_id: parsed.data.barbershop_id,
    target_reason: parsed.data.reason,
    target_ticket_reference: parsed.data.ticket_reference || null,
    target_scopes: scopes,
    duration_minutes: parsed.data.duration_minutes,
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Sessao de suporte aberta." };
}

const closeSupportSchema = z.object({
  slug: z.string().trim().min(1),
  session_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function encerrarSessaoSuporte(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const parsed = closeSupportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_close_support_session", {
    target_support_session_id: parsed.data.session_id,
    target_reason: parsed.data.reason || "Encerrada manualmente.",
  });

  if (error) return { ok: false, mensagem: traduzErro(error.message) };
  refresh(parsed.data.slug);
  return { ok: true, mensagem: "Sessao encerrada." };
}

/* ── 5. Dados cadastrais do tenant (nome, slug, e-mail, logo) ── */
const updateTenantSchema = z.object({
  slug: z.string().trim().min(1),
  barbershop_id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  new_slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().trim().max(254).optional().default(""),
  logo_url: z.string().trim().max(1000).optional().default(""),
});

export async function updateTenant(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const parsed = updateTenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, mensagem: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_update_barbershop", {
    target_barbershop_id: parsed.data.barbershop_id,
    new_name: parsed.data.name,
    new_slug: parsed.data.new_slug,
    new_email: parsed.data.email || null,
    new_logo_url: parsed.data.logo_url || null,
  });

  if (error) {
    const m = error.message.toUpperCase();
    if (m.includes("SLUG_TAKEN"))
      return { ok: false, mensagem: "Já existe uma barbearia com esse slug." };
    if (m.includes("INVALID_EMAIL"))
      return { ok: false, mensagem: "E-mail inválido." };
    if (m.includes("INVALID_DATA"))
      return { ok: false, mensagem: "Verifique nome e slug." };
    return { ok: false, mensagem: traduzErro(error.message) };
  }

  revalidatePath(`/plataforma/${parsed.data.slug}`);
  revalidatePath(`/plataforma/${parsed.data.new_slug}`);
  revalidatePath("/plataforma");
  return { ok: true, mensagem: "Dados atualizados." };
}

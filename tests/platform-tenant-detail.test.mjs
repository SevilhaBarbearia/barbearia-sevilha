import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(path) {
  return fs.readFileSync(`${root}/${path}`, "utf8");
}

test("cards de /plataforma sao Link para /plataforma/[slug]", () => {
  const src = read("src/app/plataforma/page.tsx");
  assert.match(src, /<TenantTable tenants=\{tenants\} \/>/);
  assert.match(read("src/components/platform/TenantTable.tsx"), /plataforma/);
});

test("pagina de detalhe exige Platform Admin e cobre os blocos esperados", () => {
  const src = read("src/app/plataforma/[slug]/page.tsx");
  assert.match(src, /requirePlatformAdmin/);
  assert.match(src, /platform_audit_logs/);
  assert.match(src, /platform_support_sessions/);
  assert.match(src, /barbershop_feature_overrides/);
  assert.match(src, /plan_features/);
  assert.match(src, /platform_features/);
});

test("tenant-actions expoe as 5 acoes esperadas", () => {
  const src = read("src/features/platform/tenant-actions.ts");
  assert.match(src, /export async function alterarAssinatura/);
  assert.match(src, /export async function definirFeature/);
  assert.match(src, /export async function limparOverrideFeature/);
  assert.match(src, /export async function alterarUiVersion/);
  assert.match(src, /export async function abrirSessaoSuporte/);
  assert.match(src, /export async function encerrarSessaoSuporte/);
});

test("tenant-actions chama as RPCs da 029", () => {
  const src = read("src/features/platform/tenant-actions.ts");
  assert.match(src, /platform_change_subscription/);
  assert.match(src, /platform_set_feature_override/);
  assert.match(src, /platform_clear_feature_override/);
  assert.match(src, /platform_set_ui_version/);
  assert.match(src, /platform_open_support_session/);
  assert.match(src, /platform_close_support_session/);
});

test("tenant-actions nunca usa redirect para painel de tenant", () => {
  const src = read("src/features/platform/tenant-actions.ts");
  assert.doesNotMatch(src, /redirect\(`\/admin\/\$\{/);
  assert.doesNotMatch(src, /redirect\(["'`]\/admin\//);
});

test("SubscriptionForm trata motivo obrigatorio em suspensao/cancelamento", () => {
  const src = read("src/components/platform/SubscriptionForm.tsx");
  assert.match(src, /suspender\/cancelar/);
});

test("SupportSessionForm cobre todos os 5 escopos da 029", () => {
  const src = read("src/components/platform/SupportSessionForm.tsx");
  for (const s of [
    "schedule_read",
    "customer_summary_read",
    "customer_contact_read",
    "payment_read",
    "settings_read",
  ]) {
    assert.match(src, new RegExp(s));
  }
});

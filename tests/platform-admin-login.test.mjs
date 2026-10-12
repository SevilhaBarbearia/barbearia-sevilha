import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(path) {
  return fs.readFileSync(`${root}/${path}`, "utf8");
}

test("platform-policy exige is_platform_admin e senha, sem exigir role", () => {
  const policy = read("src/lib/auth/platform-policy.ts");
  assert.match(policy, /is_platform_admin/);
  assert.match(policy, /is_active/);
  assert.match(policy, /method === "password"/);
  assert.doesNotMatch(policy, /\.role\b/);
});

test("obterPlatformAdminAtual reusa obterUsuarioAtual e nao exige role", () => {
  const src = read("src/lib/auth/platform-permissoes.ts");
  assert.match(src, /obterUsuarioAtual/);
  assert.match(src, /is_platform_admin/);
  assert.match(src, /getClaims/);
  assert.doesNotMatch(src, /role\s*!==\s*"admin"/);
});

test("requirePlatformAdmin redireciona para /plataforma/login e nunca para /admin/login", () => {
  const src = read("src/features/platform/server.ts");
  assert.match(src, /requirePlatformAdmin/);
  assert.match(src, /is_platform_admin/);
  assert.match(src, /\/plataforma\/login/);
  // So falha se /admin/login aparecer como string literal (destino de
  // redirect). Comentarios podem cita-lo como documentacao.
  assert.doesNotMatch(src, /[`"']\/admin\/login/);
});

test("pagina /plataforma/login existe e usa PlatformLoginForm", () => {
  const src = read("src/app/plataforma/login/page.tsx");
  assert.match(src, /obterPlatformAdminAtual/);
  assert.match(src, /PlatformLoginForm/);
});

test("entrarPlatformAdmin valida credenciais antes de redirecionar", () => {
  const src = read("src/lib/auth/platform-actions.ts");
  assert.match(src, /entrarPlatformAdmin/);
  assert.match(src, /signInWithPassword/);
  assert.match(src, /obterPlatformAdminAtual/);
  assert.match(src, /redirect\(next\)/);
  assert.doesNotMatch(src, /\/admin\/login/);
  assert.doesNotMatch(src, /redirect\(`\/admin\/\$\{/);
});

test("sairPlatformAdmin encerra sessao local e volta para /plataforma/login", () => {
  const src = read("src/lib/auth/platform-actions.ts");
  assert.match(src, /sairPlatformAdmin/);
  assert.match(src, /signOut\(\{\s*scope:\s*"local"\s*\}\)/);
  assert.match(src, /redirect\("\/plataforma\/login"\)/);
});

test("formulario PlatformLoginForm aponta para entrarPlatformAdmin", () => {
  const src = read("src/components/forms/PlatformLoginForm.tsx");
  assert.match(src, /entrarPlatformAdmin/);
  assert.match(src, /useActionState/);
});

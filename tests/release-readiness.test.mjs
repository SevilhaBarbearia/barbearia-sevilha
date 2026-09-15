import {
  test,
} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fileURLToPath,
} from "node:url";

const root =
  fileURLToPath(
    new URL(
      "..",
      import.meta.url,
    ),
  );

function read(path) {
  return fs.readFileSync(
    `${root}/${path}`,
    "utf8",
  );
}

test(
  "área do cliente reconcilia reservas guest antes de renderizar páginas internas",
  () => {
    const source =
      read(
        "src/app/[slug]/cliente/layout.tsx",
      );

    assert.match(
      source,
      /claim_my_guest_appointments/,
    );

    assert.match(
      source,
      /target_barbershop_id/,
    );
  },
);

test(
  "histórico não volta a depender exclusivamente de client_id",
  () => {
    const source =
      read(
        "src/app/[slug]/cliente/historico/page.tsx",
      );

    assert.doesNotMatch(
      source,
      /\.eq\(\s*["']client_id["']/,
    );

    assert.match(
      source,
      /appointmentsError|error/,
    );
  },
);

test(
  "loader global usa apenas indicador superior e não duplica o loading visual",
  () => {
    const source =
      read(
        "src/components/ui/AppRouteLoader.tsx",
      );

    /*
     * O AppRouteLoader não deve mais renderizar o modal escuro
     * com tesoura. Ele serve apenas como resposta imediata ao clique.
     */
    assert.doesNotMatch(
      source,
      /Scissors/,
    );

    assert.match(
      source,
      /styles\.indicator/,
    );

    assert.match(
      source,
      /styles\.track/,
    );

    assert.match(
      source,
      /styles\.bar/,
    );

    assert.match(
      source,
      /MIN_VISIBLE_MS\s*=\s*250/,
    );

    assert.doesNotMatch(
      source,
      /styles\.overlay|styles\.card/,
    );

    assert.doesNotMatch(
      source,
      /\[routeKey,\s*visible\]/,
    );
  },
);

test(
  "loadings específicos mantêm identidade visual com tesoura",
  () => {
    const tenantLoading =
      read(
        "src/app/[slug]/loading.tsx",
      );

    const adminLoading =
      read(
        "src/app/admin/[slug]/loading.tsx",
      );

    /*
     * A tesoura continua nos loadings reais do Next.js:
     * - público/cliente: Warm Premium claro;
     * - administração: tema escuro do painel.
     */
    assert.match(
      tenantLoading,
      /Scissors/,
    );

    assert.match(
      tenantLoading,
      /Preparando sua tela/,
    );

    assert.match(
      adminLoading,
      /Scissors/,
    );

    assert.match(
      adminLoading,
      /Carregando administração/,
    );
  },
);

test(
  "sessão possui expiração por inatividade de 30 minutos",
  () => {
    const source =
      read(
        "src/lib/auth/auth-provider.tsx",
      );

    assert.match(
      source,
      /30\s*\*\s*60\s*\*\s*1000/,
    );

    assert.match(
      source,
      /TOKEN_REFRESHED NÃO conta/,
    );
  },
);

test(
  "admin continua protegido por tenant no servidor",
  () => {
    const layout =
      read(
        "src/app/admin/[slug]/layout.tsx",
      );

    const tenancy =
      read(
        "src/features/tenancy/server.ts",
      );

    assert.match(
      layout,
      /requireBarbershopManager/,
    );

    assert.match(
      tenancy,
      /barbershop_members/,
    );

    assert.match(
      tenancy,
      /owner.*manager|manager.*owner/s,
    );
  },
);

test(
  "fluxo final possui error boundaries para público e administração",
  () => {
    assert.equal(
      fs.existsSync(
        `${root}/src/app/[slug]/error.tsx`,
      ),
      true,
    );

    assert.equal(
      fs.existsSync(
        `${root}/src/app/admin/[slug]/error.tsx`,
      ),
      true,
    );
  },
);

test(
  "configuração de ambiente não depende mais do antigo Global Config",
  () => {
    const env =
      read(
        ".env.example",
      );

    const rollout =
      read(
        "docs/ROLLOUT_UI.md",
      );

    assert.doesNotMatch(
      env,
      /EDGE_CONFIG/,
    );

    assert.doesNotMatch(
      env,
      /UI_ROLLOUT_LOCAL_TENANTS/,
    );

    assert.match(
      env,
      /UI_FORCE_LEGACY/,
    );

    assert.doesNotMatch(
      rollout,
      /warmPremiumUiTenants/,
    );
  },
);

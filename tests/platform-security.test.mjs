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
  "can_manage_barbershop não concede acesso por is_platform_admin",
  () => {
    const migration =
      read(
        "supabase/migrations/029_platform_admin_foundation.sql",
      );

    const match =
      migration.match(
        /create or replace function public\.can_manage_barbershop[\s\S]*?\$\$;/,
      );

    assert.ok(
      match,
      "A migration precisa redefinir can_manage_barbershop.",
    );

    assert.doesNotMatch(
      match[0],
      /is_platform_admin/,
    );

    assert.match(
      match[0],
      /barbershop_members/,
    );

    assert.match(
      match[0],
      /owner.*manager|manager.*owner/s,
    );
  },
);

test(
  "requireBarbershopManager não possui bypass de Platform Admin",
  () => {
    const source =
      read(
        "src/features/tenancy/server.ts",
      );

    assert.doesNotMatch(
      source,
      /is_platform_admin[\s\S]*membershipRole:\s*"owner"/,
    );

    assert.match(
      source,
      /barbershop_members/,
    );
  },
);

test(
  "tabelas de plataforma possuem RLS e não concedem escrita direta",
  () => {
    const migration =
      read(
        "supabase/migrations/029_platform_admin_foundation.sql",
      );

    for (
      const table
      of [
        "platform_features",
        "plan_features",
        "barbershop_feature_overrides",
        "platform_audit_logs",
        "platform_support_sessions",
      ]
    ) {
      assert.match(
        migration,
        new RegExp(
          `alter table public\\.${table} enable row level security`,
        ),
      );

      assert.match(
        migration,
        new RegExp(
          `revoke all on public\\.${table}`,
        ),
      );
    }

    assert.match(
      migration,
      /revoke insert, update, delete[\s\S]*on public\.subscriptions/,
    );
  },
);

test(
  "trial de 15 dias é aplicado somente no onboarding novo",
  () => {
    const migration =
      read(
        "supabase/migrations/029_platform_admin_foundation.sql",
      );

    assert.match(
      migration,
      /interval '15 days'/,
    );

    assert.doesNotMatch(
      migration,
      /update public\.subscriptions[\s\S]*trial_ends_at\s*=/i,
    );
  },
);

test(
  "modo suporte exige expiração e escopo explícito",
  () => {
    const migration =
      read(
        "supabase/migrations/029_platform_admin_foundation.sql",
      );

    assert.match(
      migration,
      /platform_support_sessions/,
    );

    assert.match(
      migration,
      /expires_at <= created_at \+ interval '30 minutes'/,
    );

    assert.match(
      migration,
      /SUPPORT_SCOPE_REQUIRED/,
    );

    assert.match(
      migration,
      /SUPPORT_SCHEDULE_VIEWED/,
    );

    assert.match(
      migration,
      /SUPPORT_CUSTOMER_CONTACT_VIEWED/,
    );
  },
);

test(
  "Platform Admin possui guard próprio e não redireciona para painel do tenant",
  () => {
    const server =
      read(
        "src/features/platform/server.ts",
      );

    const actions =
      read(
        "src/features/platform/actions.ts",
      );

    assert.match(
      server,
      /requirePlatformAdmin/,
    );

    assert.match(
      server,
      /is_platform_admin/,
    );

    assert.doesNotMatch(
      actions,
      /redirect\(`\/admin\/\$\{/,
    );

    assert.match(
      actions,
      /redirect\("\/plataforma"\)/,
    );
  },
);

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const root = fileURLToPath(
  new URL("..", import.meta.url),
);

function read(path) {
  return fs.readFileSync(
    `${root}/${path}`,
    "utf8",
  );
}

async function createDatabase() {
  const db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;

    create schema auth;

    create table auth.users (
      id uuid primary key
    );

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(
        current_setting(
          'request.jwt.claim.sub',
          true
        ),
        ''
      )::uuid
    $$;

    create function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(
        nullif(
          current_setting(
            'request.jwt.claims',
            true
          ),
          ''
        ),
        '{}'
      )::jsonb
    $$;

    create table public.barbershops (
      id uuid primary key,
      slug text not null unique,
      is_active boolean not null default true
    );
  `);

  await db.exec(
    read(
      "supabase/migrations/027_audit_fixes_rollout_and_sessions.sql",
    ),
  );

  return db;
}

test(
  "servidor recusa sessão após 30 minutos e heartbeat não a ressuscita",
  async () => {
    const db = await createDatabase();

    const userId =
      "20000000-0000-4000-8000-000000000001";

    const sessionId =
      "30000000-0000-4000-8000-000000000001";

    await db.exec(`
      insert into auth.users(id)
      values ('${userId}');

      set role authenticated;
      set request.jwt.claim.sub='${userId}';
      set request.jwt.claims='{"sub":"${userId}","session_id":"${sessionId}"}';
    `);

    const initial = await db.query(`
      select public.check_current_app_session() as active;
    `);

    assert.equal(
      initial.rows[0].active,
      true,
    );

    await db.exec(`
      reset role;

      update public.app_session_activity
      set last_activity_at = now() - interval '31 minutes'
      where session_id = '${sessionId}';

      set role authenticated;
      set request.jwt.claim.sub='${userId}';
      set request.jwt.claims='{"sub":"${userId}","session_id":"${sessionId}"}';
    `);

    const expired = await db.query(`
      select public.check_current_app_session() as active;
    `);

    assert.equal(
      expired.rows[0].active,
      false,
    );

    const touch = await db.query(`
      select public.touch_current_app_session() as touched;
    `);

    assert.equal(
      touch.rows[0].touched,
      false,
    );

    const clientSource = read(
      "src/lib/auth/auth-provider.tsx",
    );

    const serverSource = read(
      "src/lib/auth/permissoes.ts",
    );

    const proxySource = read(
      "src/proxy.ts",
    );

    assert.match(
      clientSource,
      /TOKEN_REFRESHED NÃO conta/,
    );

    assert.match(
      serverSource,
      /check_current_app_session/,
    );

    assert.match(
      proxySource,
      /check_current_app_session/,
    );

    await db.close();
  },
);

test(
  "reserva guest explica a regra de vínculo por e-mail",
  () => {
    const source = read(
      "src/components/forms/ReservaForm.tsx",
    );

    assert.match(
      source,
      /mesmo e-mail usado no login Google/,
    );

    assert.match(
      source,
      /sem e-mail não é vinculada automaticamente/,
    );
  },
);

test(
  "dependência Global Config foi removida do package.json",
  () => {
    const pkg = JSON.parse(
      read("package.json"),
    );

    assert.equal(
      Object.hasOwn(
        pkg.dependencies ?? {},
        "@vercel/global-config",
      ),
      false,
    );
  },
);

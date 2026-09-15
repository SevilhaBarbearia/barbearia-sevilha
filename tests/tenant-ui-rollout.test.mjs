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
  "rollback individual altera somente um tenant",
  async () => {
    const db = await createDatabase();

    await db.exec(`
      insert into public.barbershops (
        id,
        slug
      ) values
        (
          '10000000-0000-4000-8000-000000000001',
          'sevilha'
        ),
        (
          '10000000-0000-4000-8000-000000000002',
          'exclusivemen'
        );

      update public.barbershops
      set ui_version = 'legacy'
      where slug = 'exclusivemen';
    `);

    const result = await db.query(`
      select
        slug,
        ui_version
      from public.barbershops
      where slug in (
        'sevilha',
        'exclusivemen'
      )
      order by slug;
    `);

    assert.deepEqual(
      result.rows,
      [
        {
          slug: "exclusivemen",
          ui_version: "legacy",
        },
        {
          slug: "sevilha",
          ui_version: "warm-premium",
        },
      ],
    );

    const source = read(
      "src/lib/ui-rollout.ts",
    );

    assert.match(
      source,
      /select\("ui_version"\)/,
    );

    assert.match(
      source,
      /UI_FORCE_LEGACY/,
    );

    await db.close();
  },
);

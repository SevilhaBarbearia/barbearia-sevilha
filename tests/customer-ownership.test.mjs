import {
  test,
} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fileURLToPath,
} from "node:url";

import {
  PGlite,
} from "@electric-sql/pglite";
import {
  pgcrypto,
} from "@electric-sql/pglite/contrib/pgcrypto";
import {
  btree_gist,
} from "@electric-sql/pglite/contrib/btree_gist";

const root =
  fileURLToPath(
    new URL(
      "..",
      import.meta.url,
    ),
  );

test(
  "reserva guest é visível apenas para a identidade correta e pode ser reivindicada",
  async () => {
    const db =
      new PGlite({
        extensions: {
          pgcrypto,
          btree_gist,
        },
      });

    try {
      await db.exec(`
        create role anon;
        create role authenticated;
        create role service_role bypassrls;

        create schema auth;
        create schema storage;
        create schema extensions;

        create table auth.users(
          id uuid primary key,
          email text,
          phone text,
          raw_user_meta_data jsonb default '{}'
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

        create function auth.role()
        returns text
        language sql
        stable
        as $$
          select coalesce(
            nullif(
              current_setting(
                'request.jwt.claim.role',
                true
              ),
              ''
            ),
            current_user::text
          )
        $$;

        create table storage.buckets(
          id text primary key,
          name text,
          public boolean,
          file_size_limit bigint,
          allowed_mime_types text[]
        );

        create table storage.objects(
          id uuid primary key,
          bucket_id text,
          name text
        );

        alter table storage.objects
        enable row level security;

        create function storage.foldername(text)
        returns text[]
        language sql
        as $$
          select string_to_array($1, '/')
        $$;

        grant usage
        on schema auth, storage
        to anon, authenticated, service_role;
      `);

      for (
        const file
        of fs
          .readdirSync(
            root +
              "/supabase/migrations",
          )
          .sort()
      ) {
        await db.exec(
          fs.readFileSync(
            root +
              "/supabase/migrations/" +
              file,
            "utf8",
          ),
        );
      }

      await db.exec(
        fs.readFileSync(
          root +
            "/supabase/seed.sql",
          "utf8",
        ),
      );

      const claimant =
        "20000000-0000-4000-8000-000000000001";

      const intruder =
        "20000000-0000-4000-8000-000000000002";

      await db.exec(`
        insert into auth.users(
          id,
          email,
          raw_user_meta_data
        )
        values
          (
            '${claimant}',
            'claim@example.test',
            '{"name":"Cliente correto"}'
          ),
          (
            '${intruder}',
            'intruder@example.test',
            '{"name":"Outro cliente"}'
          );

        update public.profiles
        set
          phone = '83999999991'
        where id = '${claimant}';

        update public.profiles
        set
          phone = '83999999992'
        where id = '${intruder}';
      `);

      const query =
        async (
          sql,
          args = [],
        ) =>
          (
            await db.query(
              sql,
              args,
            )
          ).rows;

      const login =
        async (
          id,
          email,
        ) => {
          const claims =
            JSON.stringify({
              sub: id,
              email,
              amr: [
                {
                  method:
                    "password",
                },
              ],
            }).replace(
              /'/g,
              "''",
            );

          await db.exec(`
            reset role;
            set role authenticated;
            set request.jwt.claim.role = 'authenticated';
            set request.jwt.claim.sub = '${id}';
            set request.jwt.claims = '${claims}';
          `);
        };

      const shop =
        (
          await query(
            "select id from public.barbershops where slug='sevilha'",
          )
        )[0].id;

      const barber =
        (
          await query(
            `
              select id
              from public.barbers
              where barbershop_id=$1
              order by name
              limit 1
            `,
            [shop],
          )
        )[0].id;

      const service =
        (
          await query(
            `
              select id
              from public.services
              where barbershop_id=$1
              order by duration_minutes
              limit 1
            `,
            [shop],
          )
        )[0].id;

      const day =
        (
          await query(`
            select to_char(
              current_date
              + (
                  8
                  - extract(
                      dow from current_date
                    )::int
                ) % 7
              + 7,
              'YYYY-MM-DD'
            ) as day
          `)
        )[0].day;

      const slots =
        await query(
          `
            select *
            from public.available_slots(
              $1,
              $2,
              $3,
              $4
            )
          `,
          [
            shop,
            barber,
            service,
            day,
          ],
        );

      assert.ok(
        slots.length > 0,
        "A agenda de teste precisa possuir horário disponível.",
      );

      await db.exec(`
        reset role;
        set role anon;
        set request.jwt.claim.role = 'anon';
        set request.jwt.claim.sub = '';
        set request.jwt.claims = '{}';
      `);

      const guestBooking =
        (
          await query(
            `
              select *
              from public.book_guest_appointment(
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                null
              )
            `,
            [
              shop,
              barber,
              service,
              slots[0].startAt,
              "Cliente Guest",
              "83988887777",
              "claim@example.test",
            ],
          )
        )[0];

      assert.ok(
        guestBooking.appointment_id,
      );

      await login(
        intruder,
        "intruder@example.test",
      );

      assert.equal(
        (
          await query(
            `
              select id
              from public.appointments
              where id=$1
            `,
            [
              guestBooking.appointment_id,
            ],
          )
        ).length,
        0,
        "Outro cliente não pode enxergar a reserva guest.",
      );

      assert.equal(
        Number(
          (
            await query(
              `
                select public.claim_my_guest_appointments(
                  $1
                ) as claimed
              `,
              [shop],
            )
          )[0].claimed,
        ),
        0,
        "Outro e-mail não pode reivindicar a reserva.",
      );

      await login(
        claimant,
        "claim@example.test",
      );

      assert.equal(
        (
          await query(
            `
              select id
              from public.appointments
              where id=$1
            `,
            [
              guestBooking.appointment_id,
            ],
          )
        ).length,
        1,
        "A identidade com o mesmo e-mail autenticado deve enxergar a reserva.",
      );

      assert.equal(
        Number(
          (
            await query(
              `
                select public.claim_my_guest_appointments(
                  $1
                ) as claimed
              `,
              [shop],
            )
          )[0].claimed,
        ),
        1,
      );

      const claimed =
        (
          await query(
            `
              select
                client_id,
                barbershop_id
              from public.appointments
              where id=$1
            `,
            [
              guestBooking.appointment_id,
            ],
          )
        )[0];

      assert.equal(
        claimed.client_id,
        claimant,
      );

      assert.equal(
        claimed.barbershop_id,
        shop,
      );

      assert.equal(
        Number(
          (
            await query(
              `
                select public.claim_my_guest_appointments(
                  $1
                ) as claimed
              `,
              [shop],
            )
          )[0].claimed,
        ),
        0,
        "A reivindicação deve ser idempotente.",
      );
    } finally {
      await db.close();
    }
  },
);

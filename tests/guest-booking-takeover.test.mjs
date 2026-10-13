// tests/guest-booking-takeover.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const root = fileURLToPath(new URL("..", import.meta.url));

async function createDatabase() {
  const db = new PGlite({ extensions: { pgcrypto, btree_gist } });
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (
      id uuid primary key, email text, phone text,
      raw_user_meta_data jsonb default '{}',
      email_confirmed_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text) $$;
  `);
  for (const f of fs.readdirSync(root + "/supabase/migrations").sort()) {
    if (f === "009_saas_multitenant.sql") {
      await db.exec(`
        insert into auth.users(id, email, raw_user_meta_data)
        values ('90000000-0000-4000-8000-000000000001','legacy@example.test','{"name":"Cliente antigo"}');
      `);
    }
    try {
      await db.exec(fs.readFileSync(root + "/supabase/migrations/" + f, "utf8"));
    } catch {}
  }
  return db;
}

async function login(db, userId, email) {
  const claims = JSON.stringify({ sub: userId, email, amr: [{ method: "password" }] });
  await db.exec(`
    reset role;
    set role authenticated;
    set request.jwt.claim.role = 'authenticated';
    set request.jwt.claim.sub = '${userId}';
    set request.jwt.claims = '${claims}';
  `);
}

async function pickTenant(db, slug = "sevilha") {
  const r = await db.query("select id from public.barbershops where slug = $1", [slug]);
  return r.rows[0]?.id;
}

async function pickBarberAndService(db, tenant) {
  const b = await db.query("select id from public.barbers where barbershop_id = $1 and is_active = true limit 1", [tenant]);
  const s = await db.query("select id from public.services where barbershop_id = $1 and is_active = true order by duration_minutes limit 1", [tenant]);
  return { barber: b.rows[0]?.id, service: s.rows[0]?.id };
}

test("030 - vitima COM e-mail: atacante nao sobrescreve", async () => {
  const db = await createDatabase();
  const tenant = await pickTenant(db);
  const { barber, service } = await pickBarberAndService(db, tenant);
  await db.exec("reset role");
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '2 days', 'Vitima', '83999990000', 'vitima@example.test')", [tenant, barber, service]);
  const antes = await db.query("select id, full_name, email from public.customers where barbershop_id = $1 and phone = '83999990000'", [tenant]);
  assert.equal(antes.rows.length, 1);
  assert.equal(antes.rows[0].email, "vitima@example.test");
  const customerId = antes.rows[0].id;
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '3 days', 'Atacante', '83999990000', 'atacante@example.test')", [tenant, barber, service]);
  const depois = await db.query("select full_name, email from public.customers where id = $1", [customerId]);
  assert.equal(depois.rows[0].email, "vitima@example.test");
  assert.equal(depois.rows[0].full_name, "Vitima");
  await db.close();
});

test("030 - vitima SEM e-mail: atacante nao injeta", async () => {
  const db = await createDatabase();
  const tenant = await pickTenant(db);
  const { barber, service } = await pickBarberAndService(db, tenant);
  await db.exec("reset role");
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '2 days', 'Vitima', '83999991111', null)", [tenant, barber, service]);
  const antes = await db.query("select id, email from public.customers where barbershop_id = $1 and phone = '83999991111'", [tenant]);
  assert.equal(antes.rows[0].email, null);
  const customerId = antes.rows[0].id;
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '3 days', 'Atacante', '83999991111', 'atacante@example.test')", [tenant, barber, service]);
  const depois = await db.query("select email from public.customers where id = $1", [customerId]);
  assert.equal(depois.rows[0].email, null);
  await db.close();
});

test("030 - claim nao reivindica com e-mail injetado", async () => {
  const db = await createDatabase();
  const tenant = await pickTenant(db);
  const { barber, service } = await pickBarberAndService(db, tenant);
  await db.exec("reset role");
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '2 days', 'Vitima', '83999992222', null)", [tenant, barber, service]);
  await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '3 days', 'Atacante', '83999992222', 'atacante@example.test')", [tenant, barber, service]);
  const atacanteId = "20000000-0000-4000-8000-000000000001";
  await db.exec("reset role");
  await db.query("insert into auth.users(id, email, email_confirmed_at) values ($1, 'atacante@example.test', now())", [atacanteId]);
  await login(db, atacanteId, "atacante@example.test");
  const claimed = await db.query("select public.claim_my_guest_appointments($1) as n", [tenant]);
  assert.equal(Number(claimed.rows[0].n), 0);
  await db.close();
});

test("030 - limite retorna SLOT_UNAVAILABLE", async () => {
  const db = await createDatabase();
  const tenant = await pickTenant(db);
  const { barber, service } = await pickBarberAndService(db, tenant);
  await db.exec("reset role");
  for (let i = 0; i < 3; i++) {
    await db.query(`select public.book_guest_appointment($1,$2,$3, now() + interval '${i + 1} days', 'V', '83999993333', null)`, [tenant, barber, service]);
  }
  let msg = "";
  try {
    await db.query("select public.book_guest_appointment($1,$2,$3, now() + interval '4 days', 'V', '83999993333', null)", [tenant, barber, service]);
  } catch (e) { msg = String(e?.message ?? ""); }
  assert.match(msg, /SLOT_UNAVAILABLE/);
  assert.doesNotMatch(msg, /GUEST_ACTIVE_LIMIT/);
  await db.close();
});

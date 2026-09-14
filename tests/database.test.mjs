import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { pgcrypto, btree_gist } });
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage; create schema extensions;
create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema auth,storage to anon,authenticated,service_role;
`);
const root = fileURLToPath(new URL("..", import.meta.url));
try {
  for (const f of fs.readdirSync(root + "/supabase/migrations").sort()) {
    try {
      if (f === "009_saas_multitenant.sql")
        await db.exec(`
 insert into auth.users(id,email,raw_user_meta_data) values ('90000000-0000-4000-8000-000000000001','legacy@example.test','{"name":"Cliente antigo"}');
 insert into public.services(id,name,price,duration_minutes) values ('90000000-0000-4000-8000-000000000002','Serviço antigo',50,120);
 insert into public.barbers(id,name) values ('90000000-0000-4000-8000-000000000003','Barbeiro antigo');
 insert into public.appointments(id,client_id,barber_id,service_id,start_at,end_at,total_price,status) values ('90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000002',now()+interval '1 day',now()+interval '1 day 2 hours',50,'confirmed');
 `);
      await db.exec(
        fs.readFileSync(root + "/supabase/migrations/" + f, "utf8"),
      );
      console.log("PASS migration", f);
    } catch (e) {
      console.log("FAIL", f, e.message);
      process.exitCode = 1;
      break;
    }
  }
  if (!process.exitCode) {
    await db.exec(fs.readFileSync(root + "/supabase/seed.sql", "utf8"));
    console.log("PASS seed");
  }
  if (!process.exitCode) {
    const admin = "10000000-0000-4000-8000-000000000001",
      client = "10000000-0000-4000-8000-000000000002",
      owner = "10000000-0000-4000-8000-000000000003";
    await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('${admin}','admin@example.test','{"name":"Admin"}'),('${client}','client@example.test','{"name":"Cliente"}'),('${owner}','owner@example.test','{"name":"Owner"}');
 update public.profiles set role='admin',is_platform_admin=true where id='${admin}';
 update public.profiles set phone='83999999999' where id='${client}';`);
    const q = async (sql, args = []) => (await db.query(sql, args)).rows;
    const login = async (id) => {
      await db.exec(
        `reset role;set role authenticated;set request.jwt.claim.role='authenticated';set request.jwt.claim.sub='${id}';set request.jwt.claims='{"sub":"${id}","amr":[{"method":"password"}]}';`,
      );
    };
    await login(admin);
    const other = (
      await q(
        "select public.create_barbershop_with_owner('Outra','outra','owner@example.test') as id",
      )
    )[0].id;
    console.log("PASS criação transacional do tenant");
    const org = (
      await q("select organization_id from public.barbershops where id=$1", [
        other,
      ])
    )[0].organization_id;
    const second = (
      await q(
        "select public.create_barbershop_with_owner('Outra unidade','outra-unidade','owner@example.test',$1) as id",
        [org],
      )
    )[0].id;
    assert.equal(
      (
        await q("select organization_id from public.barbershops where id=$1", [
          second,
        ])
      )[0].organization_id,
      org,
    );
    console.log("PASS unidades na mesma organização");
    const shop = (
      await q("select id from public.barbershops where slug='sevilha'")
    )[0].id;
    const barber = (
      await q(
        "select id from public.barbers where barbershop_id=$1 and name='Barbeiro Principal'",
        [shop],
      )
    )[0].id;
    const service = (
      await q(
        "select id from public.services where barbershop_id=$1 order by duration_minutes limit 1",
        [shop],
      )
    )[0].id;
    await q(
      "update public.loyalty_programs set is_active=true where barbershop_id=$1",
      [shop],
    );
    const legacy = (
      await q(
        "select a.total_price,c.profile_id,a.barbershop_id from public.appointments a join public.customers c on c.id=a.customer_id where a.id='90000000-0000-4000-8000-000000000004'",
      )
    )[0];
    assert.equal(legacy.barbershop_id, shop);
    assert.equal(Number(legacy.total_price), 50);
    assert.equal(legacy.profile_id, "90000000-0000-4000-8000-000000000001");
    console.log("PASS preservação do agendamento anterior");
    await login(client);
    await q(
      "select public.save_my_customer($1,'Cliente atualizado','83999999999','client@example.test')",
      [shop],
    );
    await q(
      "select public.save_my_customer($1,'Cliente atualizado duas vezes','83999999999','client@example.test')",
      [shop],
    );
    await q("select public.save_my_preferences($1,current_date,true,false)", [
      shop,
    ]);
    assert.equal(
      (
        await q(
          "select full_name from public.customers where barbershop_id=$1 and profile_id=$2",
          [shop, client],
        )
      )[0].full_name,
      "Cliente atualizado duas vezes",
    );
    console.log("PASS cadastro e preferências transacionais");
    let rejected = false;
    try {
      await q("insert into public.appointments(barbershop_id) values ($1)", [
        shop,
      ]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS bloqueio de inserção direta");
    const day = (
      await q(
        "select to_char(current_date + (8-extract(dow from current_date)::int)%7 + 7,'YYYY-MM-DD') as day",
      )
    )[0].day;
    const slots = await q("select * from public.available_slots($1,$2,$3,$4)", [
      shop,
      barber,
      service,
      day,
    ]);
    assert(slots.length > 0);
    assert.equal(slots[0].label, "09:00");
    const appointment = (
      await q("select public.book_appointment($1,$2,$3,$4,null) as id", [
        shop,
        barber,
        service,
        slots[0].startAt,
      ])
    )[0].id;
    console.log("PASS reserva e fuso horário");
    assert(
      !(
        await q("select * from public.available_slots($1,$2,$3,$4)", [
          shop,
          barber,
          service,
          day,
        ])
      ).some((s) => s.startAt === slots[0].startAt),
    );
    rejected = false;
    try {
      await q("select public.book_appointment($1,$2,$3,$4,null)", [
        shop,
        barber,
        service,
        slots[0].startAt,
      ]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS conflito de horário");
    rejected = false;
    try {
      await q("select public.book_appointment($1,$2,$3,$4,null)", [
        other,
        barber,
        service,
        slots[1].startAt,
      ]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS referência cruzada recusada");
    await login(owner);
    assert.equal(
      (await q("select * from public.appointments where id=$1", [appointment]))
        .length,
      0,
    );
    rejected = false;
    try {
      await q("select public.mark_appointment_completed($1)", [appointment]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS isolamento de administrador");
    await login(admin);
    await q("select public.mark_appointment_completed($1)", [appointment]);
    rejected = false;
    try {
      await q("select public.mark_appointment_completed($1)", [appointment]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS conclusão não duplica pontos");
    const account = (
      await q("select * from public.loyalty_accounts where barbershop_id=$1", [
        shop,
      ])
    )[0];
    assert.equal(account.current_points, 1);
    const program = (
      await q("select id from public.loyalty_programs where barbershop_id=$1", [
        shop,
      ])
    )[0].id;
    const reward = (
      await q(
        "insert into public.loyalty_rewards(barbershop_id,loyalty_program_id,name,points_cost) values ($1,$2,'Brinde',1) returning id",
        [shop, program],
      )
    )[0].id;
    await db.exec("reset role");
    const notice = (
      await q(
        "select * from public.outbound_notifications where appointment_id=$1",
        [appointment],
      )
    )[0];
    assert(notice.payload.survey_token);
    await login(client);
    await q("select public.redeem_loyalty_reward($1)", [reward]);
    assert.equal(
      (
        await q(
          "select current_points from public.loyalty_accounts where id=$1",
          [account.id],
        )
      )[0].current_points,
      0,
    );
    rejected = false;
    try {
      await q("select public.redeem_loyalty_reward($1)", [reward]);
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS saldo e resgate sem saldo negativo");
    assert.equal(
      (
        await q("select public.submit_appointment_feedback($1,5,null) as ok", [
          notice.payload.survey_token,
        ])
      )[0].ok,
      true,
    );
    assert.equal(
      (
        await q("select public.submit_appointment_feedback($1,1,null) as ok", [
          notice.payload.survey_token,
        ])
      )[0].ok,
      false,
    );
    console.log("PASS avaliação de uso único");
    await login(admin);
    rejected = false;
    try {
      await q("select payload from public.outbound_notifications");
    } catch {
      rejected = true;
    }
    assert(rejected);
    console.log("PASS token da fila protegido");
    await q(
      "update public.notification_settings set birthday_enabled=true,birthday_send_time='00:00' where barbershop_id=$1",
      [shop],
    );
    await db.exec(
      "reset role;grant all on all tables in schema public to service_role;set role service_role;set request.jwt.claim.role='service_role';set request.jwt.claim.sub='';set request.jwt.claims='{}';",
    );
    assert.equal(
      (
        await q(
          "select public.enqueue_birthday_notifications(current_date) as n",
        )
      )[0].n,
      1,
    );
    assert.equal(
      (
        await q(
          "select public.enqueue_birthday_notifications(current_date) as n",
        )
      )[0].n,
      0,
    );
    console.log("PASS aniversário sem duplicação");
    const batch = await q("select * from public.claim_notifications(10)");
    assert.equal(batch.length, 2);
    assert.equal(
      (await q("select * from public.claim_notifications(10)")).length,
      0,
    );
    console.log("PASS fila não reclama mensagens em processamento");
    await q(
      "update public.outbound_notifications set status='failed',scheduled_at=now(),updated_at=now()-interval '11 minutes' where id=$1",
      [batch[0].id],
    );
    const retry = await q("select * from public.claim_notifications(10)");
    assert.equal(retry.length, 1);
    assert.equal(retry[0].attempts, 2);
    console.log("PASS nova tentativa preserva identidade da mensagem");
    await login(client);
    await q("select public.save_my_preferences($1,current_date,false,false)", [
      shop,
    ]);
    await db.exec(
      "reset role;set role service_role;set request.jwt.claim.role='service_role';set request.jwt.claim.sub='';set request.jwt.claims='{}';",
    );
    assert.equal(
      (await q("select * from public.claim_notifications(10)")).length,
      0,
    );
    assert.equal(
      (
        await q(
          "select * from public.outbound_notifications where status<>'canceled'",
        )
      ).length,
      0,
    );
    console.log("PASS revogação do consentimento cancela a fila");
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
await db.close();

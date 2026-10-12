import Link from "next/link";

import { ActionForm } from "@/components/forms/ActionForm";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { createBarbershop as createBarbershopResult } from "@/features/platform/actions";
import { requirePlatformAdmin } from "@/features/platform/server";
import { asFormAction } from "@/lib/actions/form-action";
import { sairPlatformAdmin } from "@/lib/auth/platform-actions";
import { createClient } from "@/lib/supabase/server";

const createBarbershop = asFormAction(createBarbershopResult);

export default async function PlatformPage() {
  await requirePlatformAdmin();

  const supabase = await createClient();

  const { data } = await supabase
    .from("barbershops")
    .select(
      `
        *,
        subscriptions (
          status,
          trial_started_at,
          trial_ends_at,
          plans (
            name
          )
        )
      `,
    )
    .order("created_at", { ascending: false });

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id,name")
    .order("name");

  return (
    <main className="fundo-premium min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-white">
            Administracao da plataforma
          </h1>

          <form action={sairPlatformAdmin}>
            <Button type="submit">Sair</Button>
          </form>
        </div>

        <Card>
          <CardTitle>Nova barbearia</CardTitle>

          <CardDescription>
            Crie previamente a conta do proprietario com e-mail e senha no
            Supabase Auth. Novos tenants recebem trial de 15 dias. Trials ja
            existentes nao sao alterados.
          </CardDescription>

          <ActionForm
            action={createBarbershop}
            className="mt-5 grid gap-4 md:grid-cols-3"
          >
            <div>
              <Label>Nome</Label>

              <Input name="name" required />
            </div>

            <div>
              <Label>Slug</Label>

              <Input
                name="slug"
                placeholder="barbearia-imperial"
                required
              />
            </div>

            <div>
              <Label>E-mail do proprietario</Label>

              <Input name="owner_email" type="email" required />
            </div>

            <div>
              <Label>Organizacao</Label>

              <Select name="organization_id">
                <option value="">Nova organizacao</option>

                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Button>Criar barbearia</Button>
            </div>
          </ActionForm>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((barbershop) => (
            <Link key={barbershop.id} href={`/plataforma/${barbershop.slug}`}>
              <Card className="h-full transition hover:border-[#B8873F]/40">
                <CardTitle>{barbershop.name}</CardTitle>

                <CardDescription>
                  /{barbershop.slug} •{" "}
                  {barbershop.subscriptions?.status || "sem plano"}
                </CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

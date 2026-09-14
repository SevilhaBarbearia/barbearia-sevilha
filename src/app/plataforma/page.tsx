import { ActionForm } from "@/components/forms/ActionForm";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { obterAdministradorAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import { createBarbershop as createBarbershopResult } from "@/features/platform/actions";
import { asFormAction } from "@/lib/actions/form-action";

const createBarbershop = asFormAction(createBarbershopResult);

export default async function PlatformPage() {
  const admin = await obterAdministradorAtual();
  if (!admin?.profile.is_platform_admin) redirect("/admin/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("barbershops")
    .select("*, subscriptions(status, trial_ends_at, plans(name))")
    .order("created_at", { ascending: false });
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id,name")
    .order("name");
  return (
    <main className="fundo-premium min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-4">
        <h1 className="text-3xl font-black text-white">
          Administração da plataforma
        </h1>
        <Card>
          <CardTitle>Nova barbearia</CardTitle>
          <CardDescription>
            Crie previamente a conta do proprietário com e-mail e senha no
            Supabase Auth. Para outra unidade do mesmo dono, selecione a
            organização.
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
              <Input name="slug" placeholder="barbearia-imperial" required />
            </div>
            <div>
              <Label>E-mail do proprietário</Label>
              <Input name="owner_email" type="email" required />
            </div>
            <div>
              <Label>Organização</Label>
              <Select name="organization_id">
                <option value="">Nova organização</option>
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
            <Card key={barbershop.id}>
              <CardTitle>{barbershop.name}</CardTitle>
              <CardDescription>
                /{barbershop.slug} •{" "}
                {barbershop.subscriptions?.status || "sem plano"}
              </CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

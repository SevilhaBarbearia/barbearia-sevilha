import { ActionForm } from "@/components/forms/ActionForm";
import { CompletarCadastroForm } from "@/components/forms/CompletarCadastroForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershop } from "@/features/tenancy/server";
import { updateCustomerPreferences as updateCustomerPreferencesResult } from "@/features/customers/actions";
import { asFormAction } from "@/lib/actions/form-action";

const updateCustomerPreferences = asFormAction(updateCustomerPreferencesResult);

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await exigirPerfilCompleto(slug);
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("barbershop_id", barbershop.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div className="grid gap-4">
      <Card>
        <CardTitle>Meus dados de contato</CardTitle>
        <CardDescription>
          Atualize os dados usados nas suas reservas.
        </CardDescription>
        <div className="mt-8">
          <CompletarCadastroForm
            slug={barbershop.slug}
            nome={profile.full_name}
            email={profile.email}
          />
        </div>
      </Card>
      <Card>
        <CardTitle>Aniversário e comunicações</CardTitle>
        <CardDescription>
          Você decide quais mensagens a {barbershop.name} pode enviar.
        </CardDescription>
        <ActionForm
          action={updateCustomerPreferences}
          className="mt-6 grid gap-4"
        >
          <input type="hidden" name="slug" value={barbershop.slug} />
          <div>
            <Label htmlFor="birth_date">Data de nascimento</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={customer?.birth_date ?? ""}
            />
          </div>
          <label className="flex gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="allow_email"
              defaultChecked={customer?.allow_email ?? true}
            />{" "}
            Autorizo mensagens por e-mail.
          </label>
          <label className="flex gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="allow_whatsapp"
              defaultChecked={customer?.allow_whatsapp ?? false}
            />{" "}
            Autorizo mensagens por WhatsApp quando o canal estiver disponível.
          </label>
          <Button type="submit">Salvar preferências</Button>
        </ActionForm>
      </Card>
    </div>
  );
}

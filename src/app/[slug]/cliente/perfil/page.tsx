import {
  Mail,
  UserRound,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { CompletarCadastroForm } from "@/components/forms/CompletarCadastroForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import {
  Input,
  Label,
} from "@/components/ui/Input";
import { updateCustomerPreferences as updateCustomerPreferencesResult } from "@/features/customers/actions";
import { requireBarbershop } from "@/features/tenancy/server";
import { asFormAction } from "@/lib/actions/form-action";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

const updateCustomerPreferences =
  asFormAction(
    updateCustomerPreferencesResult,
  );

export default async function PerfilPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const barbershop =
    await requireBarbershop(slug);

  const {
    user,
    profile,
  } =
    await exigirPerfilCompleto(
      slug,
    );

  const supabase =
    await createClient();

  const { data: customer } =
    await supabase
      .from("customers")
      .select("*")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "profile_id",
        user.id,
      )
      .maybeSingle();

  return (
    <div className="grid gap-5">
      <div>
        <Badge>
          <UserRound className="h-3.5 w-3.5" />
          Perfil
        </Badge>

        <h1 className="ui-h2 mt-4 font-extrabold text-[var(--text)]">
          Seus dados
        </h1>
      </div>

      <Card>
        <CardTitle>
          Contato
        </CardTitle>

        <CardDescription>
          Atualize os dados usados nas suas reservas.
        </CardDescription>

        <div className="mt-7">
          <CompletarCadastroForm
            slug={barbershop.slug}
            nome={
              profile.full_name
            }
            email={
              profile.email
            }
            next={`/${barbershop.slug}/cliente/perfil`}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
          <Mail className="h-5 w-5" />
        </div>

        <CardTitle>
          Aniversário e comunicações
        </CardTitle>

        <CardDescription>
          Você decide quais mensagens a {barbershop.name} pode enviar.
        </CardDescription>

        <ActionForm
          action={
            updateCustomerPreferences
          }
          className="mt-6 grid gap-4"
        >
          <input
            type="hidden"
            name="slug"
            value={
              barbershop.slug
            }
          />

          <div>
            <Label htmlFor="birth_date">
              Data de nascimento
            </Label>

            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={
                customer?.birth_date ??
                ""
              }
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[#FAF8F4] p-4 text-sm font-semibold text-[var(--text)]">
            <input
              type="checkbox"
              name="allow_email"
              defaultChecked={
                customer?.allow_email ??
                true
              }
              className="mt-1"
            />

            Autorizo mensagens por e-mail.
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[#FAF8F4] p-4 text-sm font-semibold text-[var(--text)]">
            <input
              type="checkbox"
              name="allow_whatsapp"
              defaultChecked={
                customer?.allow_whatsapp ??
                false
              }
              className="mt-1"
            />

            Autorizo mensagens por WhatsApp quando o canal estiver disponível.
          </label>

          <Button type="submit">
            Salvar preferências
          </Button>
        </ActionForm>
      </Card>
    </div>
  );
}

"use client";

import {
  useFormStatus,
} from "react-dom";

import { ActionForm } from "@/components/forms/ActionForm";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
} from "@/components/ui/Input";
import { asFormAction } from "@/lib/actions/form-action";
import { completarCadastro } from "@/lib/agendamentos/actions";

function BotaoSalvar() {
  const { pending } =
    useFormStatus();

  return (
    <Button
      disabled={pending}
      className="w-full"
    >
      {pending
        ? "Salvando..."
        : "Salvar e continuar"}
    </Button>
  );
}

export function CompletarCadastroForm({
  nome,
  email,
  slug,
  next,
}: {
  nome?: string | null;
  email?: string | null;
  slug: string;
  next?: string;
}) {
  return (
    <ActionForm
      action={asFormAction(
        completarCadastro,
      )}
      className="grid gap-4"
    >
      <input
        type="hidden"
        name="slug"
        value={slug}
      />

      {next && (
        <input
          type="hidden"
          name="next"
          value={next}
        />
      )}

      <div>
        <Label htmlFor="full_name">
          Nome completo
        </Label>

        <Input
          id="full_name"
          name="full_name"
          defaultValue={
            nome ?? ""
          }
          placeholder="Seu nome completo"
          autoComplete="name"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">
          E-mail
        </Label>

        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={
            email ?? ""
          }
          placeholder="seuemail@gmail.com"
          autoComplete="email"
        />
      </div>

      <div>
        <Label htmlFor="phone">
          Telefone/WhatsApp
        </Label>

        <Input
          id="phone"
          name="phone"
          placeholder="(83) 99999-9999"
          autoComplete="tel"
          inputMode="tel"
          required
        />

        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          Esse telefone ficará salvo para contato sobre seus agendamentos.
        </p>
      </div>

      <BotaoSalvar />
    </ActionForm>
  );
}

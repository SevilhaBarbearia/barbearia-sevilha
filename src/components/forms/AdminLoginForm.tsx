"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
} from "@/components/ui/Input";
import { entrarAdministrador } from "@/lib/auth/admin-actions";

export function AdminLoginForm({
  next = "/admin",
}: {
  next?: string;
}) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    entrarAdministrador,
    {
      erro: "",
    },
  );

  return (
    <form
      action={action}
      className="mt-6 grid gap-4"
    >
      <input
        type="hidden"
        name="next"
        value={next}
      />

      <div>
        <Label htmlFor="admin-email">
          E-mail
        </Label>

        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
        />
      </div>

      <div>
        <Label htmlFor="admin-password">
          Senha
        </Label>

        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </div>

      {state.erro && (
        <p
          role="alert"
          className="rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
        >
          {state.erro}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
      >
        {pending
          ? "Entrando..."
          : "Entrar na administração"}
      </Button>

      <p className="text-sm text-[var(--text-muted)]">
        O acesso é liberado apenas para a barbearia vinculada à sua conta
        administrativa.
      </p>
    </form>
  );
}

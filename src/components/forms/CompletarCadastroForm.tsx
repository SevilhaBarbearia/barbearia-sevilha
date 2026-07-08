'use client';

import { useFormStatus } from 'react-dom';
import { completarCadastro } from '@/lib/agendamentos/actions';
import { asFormAction } from '@/lib/actions/form-action';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} className="w-full">{pending ? 'Salvando...' : 'Salvar cadastro'}</Button>;
}

export function CompletarCadastroForm({ nome, email }: { nome?: string | null; email?: string | null }) {
  return (
    <form action={asFormAction(completarCadastro)} className="grid gap-4">
      <div>
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" defaultValue={nome ?? ''} placeholder="Seu nome completo" required />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={email ?? ''} placeholder="seuemail@gmail.com" />
      </div>
      <div>
        <Label htmlFor="phone">Telefone/WhatsApp</Label>
        <Input id="phone" name="phone" placeholder="(83) 99999-9999" required />
        <p className="mt-2 text-xs text-zinc-400">Esse telefone ficará salvo para contato da barbearia.</p>
      </div>
      <BotaoSalvar />
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import { entrarAdministrador } from '@/lib/auth/admin-actions';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(entrarAdministrador, { erro: '' });
  return (
    <form action={action} className="mt-6 grid gap-4">
      <div>
        <Label htmlFor="admin-email">E-mail</Label>
        <Input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required />
      </div>
      <div>
        <Label htmlFor="admin-password">Senha</Label>
        <Input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required />
      </div>
      {state.erro && <p role="alert" className="text-sm text-red-300">{state.erro}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Entrando...' : 'Entrar na administração'}</Button>
      <p className="text-sm text-zinc-400">Esqueceu a senha? Entre em contato com o responsável pelo sistema.</p>
    </form>
  );
}

'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';

type BotaoSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  texto: string;
  textoCarregando?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function BotaoSubmit({ texto, textoCarregando = 'Salvando...', variant, ...props }: BotaoSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" variant={variant} disabled={pending || props.disabled}>
      {pending ? textoCarregando : texto}
    </Button>
  );
}

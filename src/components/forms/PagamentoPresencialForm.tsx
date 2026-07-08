'use client';

import { useFormStatus } from 'react-dom';
import { registrarPagamentoPresencial } from '@/lib/agendamentos/actions';
import { asFormAction } from '@/lib/actions/form-action';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';

function BotaoPagamento() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? 'Registrando...' : 'Registrar pagamento'}</Button>;
}

export function PagamentoPresencialForm({ appointmentId, valorPadrao }: { appointmentId: string; valorPadrao?: number }) {
  return (
    <form action={asFormAction(registrarPagamentoPresencial)} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <div>
        <Label>Valor recebido</Label>
        <Input name="amount" type="number" step="0.01" defaultValue={valorPadrao ?? ''} required />
      </div>
      <div>
        <Label>Forma</Label>
        <Select name="method" defaultValue="pix">
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="cartao_credito">Cartão de crédito</option>
          <option value="cartao_debito">Cartão de débito</option>
          <option value="outro">Outro</option>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select name="status" defaultValue="paid">
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="canceled">Cancelado</option>
        </Select>
      </div>
      <div className="self-end"><BotaoPagamento /></div>
    </form>
  );
}

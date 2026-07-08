'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarDays, MessageSquareText, Scissors, UserRound } from 'lucide-react';
import type { Barber, Service } from '@/lib/db/types';
import { criarAgendamento } from '@/lib/agendamentos/actions';
import { asFormAction } from '@/lib/actions/form-action';
import { Button } from '@/components/ui/Button';
import { Label, Select, Textarea, Input } from '@/components/ui/Input';
import { SeletorHorario } from '@/components/agendamento/SeletorHorario';
import { formatarMoeda } from '@/lib/utils';

type BarberComServicos = Barber & {
  barber_services?: Array<{ service_id: string; is_active: boolean }> | null;
};

function BotaoConfirmar({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending || disabled} className="w-full text-sm sm:text-base">
      {pending ? 'Confirmando reserva...' : 'Confirmar reserva'}
    </Button>
  );
}

export function ReservaForm({ services, barbers }: { services: Service[]; barbers: BarberComServicos[] }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const barbeirosDoServico = useMemo(() => {
    if (!serviceId) return [];

    return barbers.filter((barbeiro) =>
      barbeiro.barber_services?.some((vinculo) => vinculo.service_id === serviceId && vinculo.is_active)
    );
  }, [barbers, serviceId]);

  const [barberId, setBarberId] = useState(barbeirosDoServico[0]?.id ?? '');
  const [data, setData] = useState('');

  useEffect(() => {
    const barbeiroContinuaDisponivel = barbeirosDoServico.some((barbeiro) => barbeiro.id === barberId);
    if (!barbeiroContinuaDisponivel) {
      setBarberId(barbeirosDoServico[0]?.id ?? '');
    }
  }, [barbeirosDoServico, barberId]);

  if (services.length === 0 || barbers.length === 0) {
    return (
      <div className="rounded-2xl sm:rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-4 sm:p-5 text-sm leading-6 text-yellow-100">
        Ainda não existem serviços ou barbeiros ativos para reserva. Cadastre e ative pelo painel administrativo.
      </div>
    );
  }

  const semBarbeiroParaServico = Boolean(serviceId) && barbeirosDoServico.length === 0;

  return (
    <form action={asFormAction(criarAgendamento)} className="grid gap-4">
      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/18 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-100"><Scissors className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Etapa 1</p>
            <Label className="mb-0">Serviço</Label>
          </div>
        </div>
        <Select name="service_id" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {services.map((servico) => (
            <option key={servico.id} value={servico.id}>
              {servico.name} - {formatarMoeda(Number(servico.price))} - {servico.duration_minutes} min
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/18 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-100"><UserRound className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Etapa 2</p>
            <Label className="mb-0">Barbeiro</Label>
          </div>
        </div>

        {semBarbeiroParaServico ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
            Nenhum barbeiro ativo está vinculado a este serviço. No painel administrativo, edite um barbeiro e marque este serviço na lista de serviços realizados.
          </div>
        ) : (
          <Select name="barber_id" value={barberId} onChange={(e) => setBarberId(e.target.value)} required>
            {barbeirosDoServico.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </Select>
        )}
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/18 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-100"><CalendarDays className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Etapa 3</p>
            <Label className="mb-0">Data e horário</Label>
          </div>
        </div>
        <div className="grid gap-4">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required disabled={semBarbeiroParaServico} />
          <SeletorHorario barberId={barberId} serviceId={serviceId} data={data} />
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/18 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-100"><MessageSquareText className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Opcional</p>
            <Label className="mb-0">Observações</Label>
          </div>
        </div>
        <Textarea name="client_notes" placeholder="Ex.: prefiro degradê baixo, cabelo mais curto nas laterais..." rows={4} />
      </div>

      <BotaoConfirmar disabled={semBarbeiroParaServico} />
    </form>
  );
}

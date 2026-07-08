import {
  alternarStatusHorarioAtendimento,
  atualizarHorarioAtendimento,
  criarBloqueioHorario,
  criarHorarioAtendimento,
  excluirBloqueioHorario,
  excluirHorarioAtendimento
} from '@/lib/admin/actions';
import type { Barber, BlockedSlot, BusinessHour } from '@/lib/db/types';
import { asFormAction } from '@/lib/actions/form-action';
import { BotaoSubmit } from '@/components/forms/BotaoSubmit';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

export const diasDaSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

type HorarioAtendimentoFormProps = {
  barbeiros: Barber[];
  horario?: BusinessHour;
};

function formatarDateTimeLocal(valorISO?: string | null) {
  if (!valorISO) return '';
  const data = new Date(valorISO);
  if (Number.isNaN(data.getTime())) return '';

  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function limparHora(hora?: string | null) {
  return hora ? hora.slice(0, 5) : '';
}

export function HorarioAtendimentoForm({ barbeiros, horario }: HorarioAtendimentoFormProps) {
  const editando = Boolean(horario?.id);
  const action = asFormAction(editando ? atualizarHorarioAtendimento : criarHorarioAtendimento);

  return (
    <form action={action} className="grid gap-4">
      {horario?.id && <input type="hidden" name="id" value={horario.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`barber-${horario?.id ?? 'novo'}`}>Barbeiro</Label>
          <Select
            id={`barber-${horario?.id ?? 'novo'}`}
            name="barber_id"
            defaultValue={horario?.barber_id ?? barbeiros[0]?.id ?? ''}
            required
            disabled={barbeiros.length === 0}
          >
            {barbeiros.length === 0 && <option value="">Cadastre um barbeiro primeiro</option>}
            {barbeiros.map((barbeiro) => (
              <option key={barbeiro.id} value={barbeiro.id}>
                {barbeiro.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`day-${horario?.id ?? 'novo'}`}>Dia da semana</Label>
          <Select id={`day-${horario?.id ?? 'novo'}`} name="day_of_week" defaultValue={horario?.day_of_week ?? 1} required>
            {diasDaSemana.map((dia) => (
              <option key={dia.value} value={dia.value}>
                {dia.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor={`start-${horario?.id ?? 'novo'}`}>Início</Label>
          <Input
            id={`start-${horario?.id ?? 'novo'}`}
            name="start_time"
            type="time"
            defaultValue={limparHora(horario?.start_time) || '08:00'}
            required
          />
        </div>

        <div>
          <Label htmlFor={`end-${horario?.id ?? 'novo'}`}>Fim</Label>
          <Input
            id={`end-${horario?.id ?? 'novo'}`}
            name="end_time"
            type="time"
            defaultValue={limparHora(horario?.end_time) || '18:00'}
            required
          />
        </div>

        <div>
          <Label htmlFor={`break-start-${horario?.id ?? 'novo'}`}>Início da pausa</Label>
          <Input
            id={`break-start-${horario?.id ?? 'novo'}`}
            name="break_start"
            type="time"
            defaultValue={limparHora(horario?.break_start)}
          />
        </div>

        <div>
          <Label htmlFor={`break-end-${horario?.id ?? 'novo'}`}>Fim da pausa</Label>
          <Input
            id={`break-end-${horario?.id ?? 'novo'}`}
            name="break_end"
            type="time"
            defaultValue={limparHora(horario?.break_end)}
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={horario?.is_active ?? true}
          className="h-4 w-4 rounded border-white/20 bg-zinc-900"
        />
        Expediente ativo e disponível para reservas
      </label>

      <div className="flex flex-wrap gap-3">
        <BotaoSubmit texto={editando ? 'Salvar horário' : 'Cadastrar horário'} disabled={barbeiros.length === 0} />
      </div>
    </form>
  );
}

export function AlternarStatusHorarioForm({ horario }: { horario: BusinessHour }) {
  const proximoStatus = !horario.is_active;

  return (
    <form action={asFormAction(alternarStatusHorarioAtendimento)}>
      <input type="hidden" name="id" value={horario.id} />
      <input type="hidden" name="is_active" value={String(proximoStatus)} />
      <Button type="submit" variant={horario.is_active ? 'danger' : 'secondary'}>
        {horario.is_active ? 'Desativar' : 'Ativar'}
      </Button>
    </form>
  );
}

export function ExcluirHorarioForm({ horario }: { horario: BusinessHour }) {
  return (
    <form action={asFormAction(excluirHorarioAtendimento)}>
      <input type="hidden" name="id" value={horario.id} />
      <Button type="submit" variant="ghost">
        Excluir
      </Button>
    </form>
  );
}

type BloqueioHorarioFormProps = {
  barbeiros: Barber[];
};

export function BloqueioHorarioForm({ barbeiros }: BloqueioHorarioFormProps) {
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={asFormAction(criarBloqueioHorario)} className="grid gap-4">
      <div>
        <Label htmlFor="bloqueio-barbeiro">Barbeiro</Label>
        <Select id="bloqueio-barbeiro" name="barber_id" defaultValue={barbeiros[0]?.id ?? ''} required disabled={barbeiros.length === 0}>
          {barbeiros.length === 0 && <option value="">Cadastre um barbeiro primeiro</option>}
          {barbeiros.map((barbeiro) => (
            <option key={barbeiro.id} value={barbeiro.id}>
              {barbeiro.name}
            </option>
          ))}
        </Select>
      </div>

      {/*
        Bloqueio separado por dia + horários para simplificar a operação.
        A action monta start_at/end_at no servidor, mantendo compatibilidade com o banco.
      */}
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Label htmlFor="bloqueio-data">Dia do bloqueio</Label>
          <Input id="bloqueio-data" name="block_date" type="date" defaultValue={hoje} required />
        </div>

        <div>
          <Label htmlFor="bloqueio-inicio">Início</Label>
          <Input id="bloqueio-inicio" name="block_start_time" type="time" defaultValue="08:00" required />
        </div>

        <div>
          <Label htmlFor="bloqueio-fim">Fim</Label>
          <Input id="bloqueio-fim" name="block_end_time" type="time" defaultValue="18:00" required />
        </div>
      </div>

      <div>
        <Label htmlFor="bloqueio-motivo">Motivo/observação</Label>
        <Textarea id="bloqueio-motivo" name="reason" placeholder="Ex.: almoço externo, manutenção, folga, compromisso pessoal..." rows={3} />
      </div>

      <BotaoSubmit texto="Criar bloqueio" disabled={barbeiros.length === 0} />
    </form>
  );
}

export function ExcluirBloqueioForm({ bloqueio }: { bloqueio: BlockedSlot }) {
  return (
    <form action={asFormAction(excluirBloqueioHorario)}>
      <input type="hidden" name="id" value={bloqueio.id} />
      <Button type="submit" variant="danger">
        Remover bloqueio
      </Button>
    </form>
  );
}

export { formatarDateTimeLocal };

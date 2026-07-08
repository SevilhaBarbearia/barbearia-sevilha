import { Clock3 } from 'lucide-react';
import { criarBarbeiro, atualizarBarbeiro, alternarStatusBarbeiro } from '@/lib/admin/actions';
import { asFormAction } from '@/lib/actions/form-action';
import type { Barber, BusinessHour, Service } from '@/lib/db/types';
import { BotaoSubmit } from '@/components/forms/BotaoSubmit';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';

type BarbeiroComServicos = Barber & {
  barber_services?: Array<{ service_id: string; is_active: boolean }> | null;
};

type BarbeiroAdminFormProps = {
  barbeiro?: BarbeiroComServicos;
  servicos: Service[];
  horarioPadrao?: BusinessHour | null;
};

function limparHora(hora?: string | null) {
  return hora ? hora.slice(0, 5) : '';
}

export function BarbeiroAdminForm({ barbeiro, servicos, horarioPadrao }: BarbeiroAdminFormProps) {
  const editando = Boolean(barbeiro?.id);
  const action = asFormAction(editando ? atualizarBarbeiro : criarBarbeiro);
  const servicosVinculados = new Set(
    barbeiro?.barber_services
      ?.filter((item) => item.is_active)
      .map((item) => item.service_id) ?? []
  );

  return (
    <form action={action} className="grid gap-4">
      {barbeiro?.id && <input type="hidden" name="id" value={barbeiro.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`name-${barbeiro?.id ?? 'novo'}`}>Nome do barbeiro</Label>
          <Input
            id={`name-${barbeiro?.id ?? 'novo'}`}
            name="name"
            defaultValue={barbeiro?.name ?? ''}
            placeholder="Ex.: João Silva"
            required
          />
        </div>

        <div>
          <Label htmlFor={`phone-${barbeiro?.id ?? 'novo'}`}>Telefone/WhatsApp</Label>
          <Input
            id={`phone-${barbeiro?.id ?? 'novo'}`}
            name="phone"
            defaultValue={barbeiro?.phone ?? ''}
            placeholder="(83) 99999-9999"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`photo-${barbeiro?.id ?? 'novo'}`}>URL da foto</Label>
        <Input
          id={`photo-${barbeiro?.id ?? 'novo'}`}
          name="photo_url"
          type="url"
          defaultValue={barbeiro?.photo_url ?? ''}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor={`bio-${barbeiro?.id ?? 'novo'}`}>Biografia</Label>
        <Textarea
          id={`bio-${barbeiro?.id ?? 'novo'}`}
          name="bio"
          defaultValue={barbeiro?.bio ?? ''}
          placeholder="Especialidade, experiência e estilo de atendimento."
          rows={3}
        />
      </div>

      <div className="rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-4 sm:rounded-[1.5rem] sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500/20 text-brand-100">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Expediente do barbeiro</p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              Este horário será aplicado internamente de segunda a sábado. Domingo fica fechado por padrão.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor={`start-${barbeiro?.id ?? 'novo'}`}>Início</Label>
            <Input
              id={`start-${barbeiro?.id ?? 'novo'}`}
              name="start_time"
              type="time"
              defaultValue={limparHora(horarioPadrao?.start_time) || '09:00'}
              required
            />
          </div>

          <div>
            <Label htmlFor={`end-${barbeiro?.id ?? 'novo'}`}>Fim</Label>
            <Input
              id={`end-${barbeiro?.id ?? 'novo'}`}
              name="end_time"
              type="time"
              defaultValue={limparHora(horarioPadrao?.end_time) || '18:00'}
              required
            />
          </div>

          <div>
            <Label htmlFor={`break-start-${barbeiro?.id ?? 'novo'}`}>Início do intervalo</Label>
            <Input
              id={`break-start-${barbeiro?.id ?? 'novo'}`}
              name="break_start"
              type="time"
              defaultValue={limparHora(horarioPadrao?.break_start) || '12:00'}
            />
          </div>

          <div>
            <Label htmlFor={`break-end-${barbeiro?.id ?? 'novo'}`}>Fim do intervalo</Label>
            <Input
              id={`break-end-${barbeiro?.id ?? 'novo'}`}
              name="break_end"
              type="time"
              defaultValue={limparHora(horarioPadrao?.break_end) || '13:00'}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Serviços que este barbeiro realiza</Label>
        {servicos.length === 0 ? (
          <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Cadastre pelo menos um serviço antes de vincular serviços ao barbeiro.
          </p>
        ) : (
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
            {servicos.map((servico) => (
              <label key={servico.id} className="flex items-center gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  name="service_ids"
                  value={servico.id}
                  defaultChecked={!editando || servicosVinculados.has(servico.id)}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-900"
                />
                {servico.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={barbeiro?.is_active ?? true}
          className="h-4 w-4 rounded border-white/20 bg-zinc-900"
        />
        Barbeiro ativo e visível para reservas
      </label>

      <BotaoSubmit texto={editando ? 'Salvar alterações' : 'Cadastrar barbeiro'} />
    </form>
  );
}

export function AlternarStatusBarbeiroForm({ barbeiro }: { barbeiro: Barber }) {
  const proximoStatus = !barbeiro.is_active;

  return (
    <form action={asFormAction(alternarStatusBarbeiro)}>
      <input type="hidden" name="id" value={barbeiro.id} />
      <input type="hidden" name="is_active" value={String(proximoStatus)} />
      <Button type="submit" variant={barbeiro.is_active ? 'danger' : 'secondary'}>
        {barbeiro.is_active ? 'Desativar' : 'Ativar'}
      </Button>
    </form>
  );
}

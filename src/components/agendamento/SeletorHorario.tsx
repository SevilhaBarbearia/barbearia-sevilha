'use client';

import { useEffect, useState } from 'react';
import type { AvailableSlot } from '@/lib/db/types';

export function SeletorHorario({ barberId, serviceId, data, name = 'start_at' }: { barberId?: string; serviceId?: string; data?: string; name?: string }) {
  const [horarios, setHorarios] = useState<AvailableSlot[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!barberId || !serviceId || !data) return;

    setCarregando(true);
    const params = new URLSearchParams({ barberId, serviceId, data });
    fetch(`/api/horarios-disponiveis?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setHorarios(json.horarios ?? []))
      .finally(() => setCarregando(false));
  }, [barberId, serviceId, data]);

  if (!barberId || !serviceId || !data) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">Escolha serviço, barbeiro e data para ver os horários.</p>;
  }

  if (carregando) return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">Buscando horários disponíveis...</p>;

  if (horarios.length === 0) return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">Nenhum horário disponível para essa data.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-4">
      {horarios.map((horario) => (
        <label
          key={horario.startAt}
          className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-center text-xs font-black text-white shadow-lg shadow-black/10 transition hover:border-brand-500/45 hover:bg-brand-500/10 has-[:checked]:border-brand-100 has-[:checked]:bg-brand-500 has-[:checked]:text-brand-950 has-[:checked]:shadow-button sm:min-h-14 sm:text-sm"
        >
          {/* Input invisível mantém acessibilidade e permite estilizar o label selecionado. */}
          <input type="radio" name={name} value={horario.startAt} className="sr-only" required />
          {horario.label}
        </label>
      ))}
    </div>
  );
}

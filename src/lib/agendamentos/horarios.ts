import { addMinutes, format, isBefore, isEqual, parseISO, set } from 'date-fns';
import type { AvailableSlot, BusySlot, BusinessHour } from '@/lib/db/types';

type CalcularHorariosParams = {
  dataISO: string;
  duracaoMinutos: number;
  expediente: BusinessHour[];
  ocupados: BusySlot[];
  bloqueados: BusySlot[];
  agora?: Date;
};

function montarDataComHorario(dataBase: Date, horario: string) {
  const [hours, minutes] = horario.split(':').map(Number);
  return set(dataBase, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function intervalosSobrepoem(inicioA: Date, fimA: Date, inicioB: Date, fimB: Date) {
  return inicioA < fimB && fimA > inicioB;
}

function estaDentroDoIntervalo(inicio: Date, fim: Date, inicioJanela: Date, fimJanela: Date) {
  return (isEqual(inicio, inicioJanela) || inicio > inicioJanela) && (isEqual(fim, fimJanela) || fim < fimJanela);
}

export function calcularHorariosDisponiveis({
  dataISO,
  duracaoMinutos,
  expediente,
  ocupados,
  bloqueados,
  agora = new Date()
}: CalcularHorariosParams): AvailableSlot[] {
  const data = parseISO(dataISO);
  const diaSemana = data.getDay();
  const expedientesDoDia = expediente.filter((item) => item.day_of_week === diaSemana && item.is_active);
  const indisponiveis = [...ocupados, ...bloqueados];
  const horarios: AvailableSlot[] = [];

  for (const item of expedientesDoDia) {
    const inicioExpediente = montarDataComHorario(data, item.start_time);
    const fimExpediente = montarDataComHorario(data, item.end_time);
    const inicioPausa = item.break_start ? montarDataComHorario(data, item.break_start) : null;
    const fimPausa = item.break_end ? montarDataComHorario(data, item.break_end) : null;

    let cursor = inicioExpediente;

    while (addMinutes(cursor, duracaoMinutos) <= fimExpediente) {
      const inicioSlot = cursor;
      const fimSlot = addMinutes(cursor, duracaoMinutos);
      const estaNoPassado = isBefore(inicioSlot, agora);
      const conflitaComPausa = inicioPausa && fimPausa && intervalosSobrepoem(inicioSlot, fimSlot, inicioPausa, fimPausa);
      const conflitaComAgenda = indisponiveis.some((slot) =>
        intervalosSobrepoem(inicioSlot, fimSlot, parseISO(slot.start_at), parseISO(slot.end_at))
      );
      const dentroDoExpediente = estaDentroDoIntervalo(inicioSlot, fimSlot, inicioExpediente, fimExpediente);

      if (!estaNoPassado && !conflitaComPausa && !conflitaComAgenda && dentroDoExpediente) {
        horarios.push({
          startAt: inicioSlot.toISOString(),
          endAt: fimSlot.toISOString(),
          label: format(inicioSlot, 'HH:mm')
        });
      }

      // Granularidade padrão: agenda a cada 15 minutos.
      cursor = addMinutes(cursor, 15);
    }
  }

  return horarios;
}

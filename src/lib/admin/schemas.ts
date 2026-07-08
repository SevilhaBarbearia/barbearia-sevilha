import { z } from 'zod';

const telefoneOpcionalRegex = /^\d{10,13}$/;
const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

function limparTextoOpcional(valor: unknown) {
  const texto = String(valor ?? '').trim();
  return texto.length > 0 ? texto : null;
}

function limparUrlOpcional(valor: unknown) {
  const texto = String(valor ?? '').trim();
  return texto.length > 0 ? texto : null;
}

function normalizarTelefoneOpcional(valor: unknown) {
  const numeros = String(valor ?? '').replace(/\D/g, '');
  return numeros.length > 0 ? numeros : null;
}

function limparHoraOpcional(valor: unknown) {
  const texto = String(valor ?? '').trim();
  return texto.length > 0 ? texto : null;
}

function minutosDaHora(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

export const servicoAdminSchema = z.object({
  id: z.string().uuid('Serviço inválido.').optional(),
  name: z.string().trim().min(2, 'Informe o nome do serviço.'),
  description: z.preprocess(limparTextoOpcional, z.string().max(700).nullable()),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  duration_minutes: z.coerce
    .number()
    .int('A duração precisa ser um número inteiro.')
    .min(5, 'A duração mínima é de 5 minutos.')
    .max(480, 'A duração máxima é de 480 minutos.'),
  image_url: z.preprocess(
    limparUrlOpcional,
    z.string().url('Informe uma URL válida para a imagem.').nullable()
  ),
  is_active: z.boolean().default(true)
});

export const barbeiroAdminSchema = z
  .object({
    id: z.string().uuid('Barbeiro inválido.').optional(),
    name: z.string().trim().min(2, 'Informe o nome do barbeiro.'),
    bio: z.preprocess(limparTextoOpcional, z.string().max(700).nullable()),
    photo_url: z.preprocess(
      limparUrlOpcional,
      z.string().url('Informe uma URL válida para a foto.').nullable()
    ),
    phone: z.preprocess(
      normalizarTelefoneOpcional,
      z.string().regex(telefoneOpcionalRegex, 'Informe um telefone válido com DDD.').nullable()
    ),
    // Expediente padrão do barbeiro: aplicado internamente de segunda a sábado.
    // Domingo permanece fechado por padrão e deve ser tratado por regra futura específica.
    start_time: z.string().regex(horaRegex, 'Informe um horário inicial válido.'),
    end_time: z.string().regex(horaRegex, 'Informe um horário final válido.'),
    break_start: z.preprocess(limparHoraOpcional, z.string().regex(horaRegex, 'Informe um início de pausa válido.').nullable()),
    break_end: z.preprocess(limparHoraOpcional, z.string().regex(horaRegex, 'Informe um fim de pausa válido.').nullable()),
    is_active: z.boolean().default(true),
    service_ids: z.array(z.string().uuid()).default([])
  })
  .superRefine((dados, ctx) => {
    const inicio = minutosDaHora(dados.start_time);
    const fim = minutosDaHora(dados.end_time);

    if (fim <= inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'O horário final precisa ser maior que o horário inicial.'
      });
    }

    const informouApenasUmaPausa = Boolean(dados.break_start) !== Boolean(dados.break_end);
    if (informouApenasUmaPausa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['break_start'],
        message: 'Informe início e fim da pausa ou deixe os dois campos vazios.'
      });
    }

    if (dados.break_start && dados.break_end) {
      const inicioPausa = minutosDaHora(dados.break_start);
      const fimPausa = minutosDaHora(dados.break_end);

      if (fimPausa <= inicioPausa) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['break_end'],
          message: 'O fim da pausa precisa ser maior que o início da pausa.'
        });
      }

      if (inicioPausa < inicio || fimPausa > fim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['break_start'],
          message: 'A pausa precisa ficar dentro do expediente informado.'
        });
      }
    }
  });

export const horarioAtendimentoSchema = z
  .object({
    id: z.string().uuid('Horário inválido.').optional(),
    barber_id: z.string().uuid('Selecione um barbeiro válido.'),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(horaRegex, 'Informe um horário inicial válido.'),
    end_time: z.string().regex(horaRegex, 'Informe um horário final válido.'),
    break_start: z.preprocess(limparHoraOpcional, z.string().regex(horaRegex, 'Informe um início de pausa válido.').nullable()),
    break_end: z.preprocess(limparHoraOpcional, z.string().regex(horaRegex, 'Informe um fim de pausa válido.').nullable()),
    is_active: z.boolean().default(true)
  })
  .superRefine((dados, ctx) => {
    const inicio = minutosDaHora(dados.start_time);
    const fim = minutosDaHora(dados.end_time);

    if (fim <= inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'O horário final precisa ser maior que o horário inicial.'
      });
    }

    const informouApenasUmaPausa = Boolean(dados.break_start) !== Boolean(dados.break_end);
    if (informouApenasUmaPausa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['break_start'],
        message: 'Informe início e fim da pausa ou deixe os dois campos vazios.'
      });
    }

    if (dados.break_start && dados.break_end) {
      const inicioPausa = minutosDaHora(dados.break_start);
      const fimPausa = minutosDaHora(dados.break_end);

      if (fimPausa <= inicioPausa) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['break_end'],
          message: 'O fim da pausa precisa ser maior que o início da pausa.'
        });
      }

      if (inicioPausa < inicio || fimPausa > fim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['break_start'],
          message: 'A pausa precisa ficar dentro do expediente informado.'
        });
      }
    }
  });

export const bloqueioHorarioSchema = z
  .object({
    id: z.string().uuid('Bloqueio inválido.').optional(),
    barber_id: z.string().uuid('Selecione um barbeiro válido.'),
    start_at: z.string().min(1, 'Informe o início do bloqueio.'),
    end_at: z.string().min(1, 'Informe o fim do bloqueio.'),
    reason: z.preprocess(limparTextoOpcional, z.string().max(300).nullable())
  })
  .superRefine((dados, ctx) => {
    const inicio = new Date(dados.start_at);
    const fim = new Date(dados.end_at);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start_at'], message: 'Informe datas válidas.' });
      return;
    }

    if (fim <= inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_at'],
        message: 'O fim do bloqueio precisa ser maior que o início.'
      });
    }
  });

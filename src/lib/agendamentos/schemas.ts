import { z } from 'zod';

const telefoneRegex = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

export const completarCadastroSchema = z.object({
  full_name: z.string().min(3, 'Informe seu nome completo.'),
  phone: z.string().regex(telefoneRegex, 'Informe um telefone/WhatsApp válido.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal(''))
});

export const criarAgendamentoSchema = z.object({
  service_id: z.string().uuid('Serviço inválido.'),
  barber_id: z.string().uuid('Barbeiro inválido.'),
  start_at: z.string().datetime('Data e horário inválidos.'),
  client_notes: z.string().max(500, 'A observação deve ter até 500 caracteres.').optional()
});

export const cancelarAgendamentoSchema = z.object({
  appointment_id: z.string().uuid('Agendamento inválido.'),
  cancellation_reason: z.string().max(300).optional()
});

export const pagamentoPresencialSchema = z.object({
  appointment_id: z.string().uuid('Agendamento inválido.'),
  amount: z.coerce.number().positive('Informe um valor maior que zero.'),
  method: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro']),
  status: z.enum(['pending', 'paid', 'canceled']).default('paid')
});

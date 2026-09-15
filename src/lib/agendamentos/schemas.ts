import { z } from "zod";

const telefoneRegex = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

export const dadosClienteSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(100, "O nome deve ter até 100 caracteres."),
  phone: z
    .string()
    .trim()
    .regex(telefoneRegex, "Informe um telefone/WhatsApp válido."),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
});

export const completarCadastroSchema = dadosClienteSchema;

export const criarAgendamentoSchema = z.object({
  service_id: z.string().uuid("Serviço inválido."),
  barber_id: z.string().uuid("Barbeiro inválido."),
  start_at: z.string().datetime("Data e horário inválidos."),
  client_notes: z
    .string()
    .max(500, "A observação deve ter até 500 caracteres.")
    .optional(),
});

export const criarAgendamentoConvidadoSchema =
  criarAgendamentoSchema.and(dadosClienteSchema);

export const cancelarAgendamentoSchema = z.object({
  appointment_id: z.string().uuid("Agendamento inválido."),
  cancellation_reason: z.string().max(300).optional(),
});

export const pagamentoPresencialSchema = z.object({
  appointment_id: z.string().uuid("Agendamento inválido."),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  method: z.enum([
    "dinheiro",
    "pix",
    "cartao_credito",
    "cartao_debito",
    "outro",
  ]),
  status: z.enum(["pending", "paid", "canceled"]).default("paid"),
});

import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

type Notification = {
  id: string;
  recipient: string;
  subject: string | null;
  content: string;
  payload: Record<string, string>;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const emailFrom = Deno.env.get('EMAIL_FROM');
const appBaseUrl = Deno.env.get('APP_BASE_URL')?.replace(/\/$/, '');

function requireConfiguration() {
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFrom || !appBaseUrl) {
    throw new Error('A função de notificações não está configurada completamente.');
  }
}

export function renderTemplate(template: string, payload: Record<string, string>) {
  const variables = { ...payload };

  if (payload.survey_token && payload.barbershop_slug) {
    variables.link_avaliacao = `${appBaseUrl}/${payload.barbershop_slug}/avaliar/${payload.survey_token}`;
  }

  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

async function sendEmail(notification: Notification) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `notification/${notification.id}`
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [notification.recipient],
      subject: renderTemplate(notification.subject ?? 'Mensagem da sua barbearia', notification.payload),
      text: renderTemplate(notification.content, notification.payload)
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message ?? `Resend respondeu com status ${response.status}.`);
  return String(body.id ?? '');
}

export async function processNotifications(request: Request) {
  try {
    if (request.method !== 'POST') return Response.json({ error: 'Método inválido.' }, { status: 405 });
    requireConfiguration();

    // Eu exijo a chave de serviço porque esta rota é destinada apenas ao cron interno.
    const authorization = request.headers.get('authorization');
    if (authorization !== `Bearer ${serviceRoleKey}`) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: birthdayError } = await supabase.rpc('enqueue_birthday_notifications', {
      reference_date: null
    });
    if (birthdayError) throw birthdayError;

    const { data: pending, error: queueError } = await supabase.rpc('claim_notifications', { batch_size: 10 });
    if (queueError) throw queueError;

    let sent = 0;
    let failed = 0;

    for (const notification of (pending ?? []) as Notification[]) {
      try {
        const providerMessageId = await sendEmail(notification);
        const { error: saveError } = await supabase.from('outbound_notifications').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider: 'resend',
          provider_message_id: providerMessageId,
          error_message: null,
          payload: {}
        }).eq('id', notification.id);
        if (saveError) throw new Error('Falha ao registrar confirmação do provedor.');
        sent += 1;
      } catch (error) {
        await supabase.from('outbound_notifications').update({
          status: 'failed',
          scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          provider: 'resend',
          error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Falha desconhecida.'
        }).eq('id', notification.id);
        failed += 1;
      }
    }

    return Response.json({ ok: true, processed: sent + failed, sent, failed });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      { status: 500 }
    );
  }
}

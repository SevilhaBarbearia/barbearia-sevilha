import { ActionForm } from "@/components/forms/ActionForm";
import { ImageField } from "@/components/forms/ImageField";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import {
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Input";
import { requireBarbershopManager } from "@/features/tenancy/server";
import {
  updateBusinessSettings as updateBusinessSettingsResult,
  updateNotificationSettings as updateNotificationSettingsResult,
} from "@/features/settings/actions";
import { asFormAction } from "@/lib/actions/form-action";
import { createClient } from "@/lib/supabase/server";

const updateBusinessSettings = asFormAction(updateBusinessSettingsResult);
const updateNotificationSettings = asFormAction(
  updateNotificationSettingsResult,
);

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();

  const [{ data: settings }, { data: notifications }, { data: templates }] =
    await Promise.all([
      supabase
        .from("business_settings")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .maybeSingle(),
      supabase
        .from("notification_settings")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .maybeSingle(),
      supabase
        .from("message_templates")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("channel", "email"),
    ]);

  const birthday = templates?.find((item) => item.type === "birthday");
  const satisfaction = templates?.find(
    (item) => item.type === "satisfaction_survey",
  );

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-black text-white">Configurações</h1>

      <Card>
        <CardTitle>Dados e identidade</CardTitle>
        <CardDescription>
          Nome, imagens, cor e comportamento da agenda são exclusivos desta
          barbearia.
        </CardDescription>

        <ActionForm
          action={updateBusinessSettings}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="slug" value={barbershop.slug} />

          <div>
            <Label>Nome</Label>
            <Input
              name="business_name"
              defaultValue={settings?.business_name || barbershop.name}
              required
            />
          </div>

          <div>
            <Label>Cor principal</Label>
            <Input
              name="primary_color"
              type="color"
              defaultValue={barbershop.primary_color}
              required
            />
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              A cor do texto sobre esta tonalidade é calculada automaticamente
              pelo sistema usando contraste WCAG.
            </p>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input name="address" defaultValue={settings?.address || ""} />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input name="phone" defaultValue={settings?.phone || ""} />
          </div>

          <div>
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={settings?.whatsapp || ""} />
          </div>

          <div>
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={settings?.instagram || ""} />
          </div>

          <div>
            <Label>URL do logo</Label>
            <ImageField
              name="logo_url"
              defaultValue={settings?.logo_url || ""}
              slug={barbershop.slug}
              category="branding"
            />
          </div>

          <div className="md:col-span-2">
            <Label>URL do banner</Label>
            <ImageField
              name="cover_url"
              defaultValue={settings?.cover_url || ""}
              slug={barbershop.slug}
              category="branding"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              name="description"
              defaultValue={settings?.description || ""}
              rows={4}
            />
          </div>

          <div>
            <Label>Antecedência para cancelamento (horas)</Label>
            <Input
              name="cancellation_limit_hours"
              type="number"
              min="0"
              defaultValue={settings?.cancellation_limit_hours ?? 4}
            />
          </div>

          <div>
            <Label>Reserva antecipada (dias)</Label>
            <Input
              name="booking_advance_days"
              type="number"
              min="1"
              max="365"
              defaultValue={settings?.booking_advance_days ?? 30}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Intervalo entre opções de horário</Label>
            <Select
              name="slot_interval_minutes"
              defaultValue={String(settings?.slot_interval_minutes ?? 30)}
              required
            >
              <option value="15">A cada 15 minutos</option>
              <option value="30">A cada 30 minutos</option>
              <option value="45">A cada 45 minutos</option>
              <option value="60">A cada 60 minutos</option>
            </Select>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Isso controla os horários possíveis de início. A duração real de
              cada serviço continua sendo respeitada para impedir conflitos.
            </p>
          </div>

          <div>
            <Button>Salvar configurações</Button>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardTitle>Mensagens automáticas</CardTitle>
        <CardDescription>
          O canal inicial é e-mail. Use as variáveis {"{{nome}}"},{" "}
          {"{{barbearia}}"} e, na pesquisa, {"{{link_avaliacao}}"}.
        </CardDescription>

        <ActionForm
          action={updateNotificationSettings}
          className="mt-6 grid gap-4"
        >
          <input type="hidden" name="slug" value={barbershop.slug} />

          <label className="flex gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="birthday_enabled"
              defaultChecked={notifications?.birthday_enabled}
            />
            Enviar mensagem de aniversário
          </label>

          <div>
            <Label>Horário do aniversário (fuso da barbearia)</Label>
            <Input
              type="time"
              name="birthday_send_time"
              defaultValue={(
                notifications?.birthday_send_time || "09:00"
              ).slice(0, 5)}
              required
            />
          </div>

          <div>
            <Label>Mensagem de aniversário</Label>
            <Textarea
              name="birthday_message"
              rows={4}
              defaultValue={
                birthday?.content ||
                "Parabéns, {{nome}}! A equipe da {{barbearia}} deseja um excelente aniversário."
              }
              required
            />
          </div>

          <label className="flex gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="satisfaction_enabled"
              defaultChecked={notifications?.satisfaction_enabled ?? true}
            />
            Enviar pesquisa após atendimento concluído
          </label>

          <div>
            <Label>Mensagem da pesquisa</Label>
            <Textarea
              name="satisfaction_message"
              rows={4}
              defaultValue={
                satisfaction?.content ||
                "Olá, {{nome}}! Conte como foi seu atendimento na {{barbearia}}: {{link_avaliacao}}"
              }
              required
            />
          </div>

          <div>
            <Button>Salvar automações</Button>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

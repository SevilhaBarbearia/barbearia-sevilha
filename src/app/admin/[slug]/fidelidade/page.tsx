import { RewardForm } from "@/components/forms/admin/RewardForm";
import { ActionForm } from "@/components/forms/ActionForm";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershopManager } from "@/features/tenancy/server";
import {
  createLoyaltyReward as createLoyaltyRewardResult,
  saveServicePoints as saveServicePointsResult,
  updateLoyaltyProgram as updateLoyaltyProgramResult,
} from "@/features/loyalty/actions";
import { asFormAction } from "@/lib/actions/form-action";

const createLoyaltyReward = asFormAction(createLoyaltyRewardResult);
const saveServicePoints = asFormAction(saveServicePointsResult);
const updateLoyaltyProgram = asFormAction(updateLoyaltyProgramResult);

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { barbershop } = await requireBarbershopManager(slug);
  const supabase = await createClient();
  const [
    { data: program },
    { data: services },
    { data: rules },
    { data: rewards },
    { data: accountData },
  ] = await Promise.all([
    supabase
      .from("loyalty_programs")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .single(),
    supabase
      .from("services")
      .select("id,name")
      .eq("barbershop_id", barbershop.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("loyalty_service_rules")
      .select("*")
      .eq("barbershop_id", barbershop.id),
    supabase
      .from("loyalty_rewards")
      .select("*")
      .eq("barbershop_id", barbershop.id)
      .order("points_cost"),
    supabase
      .from("loyalty_accounts")
      .select("current_points, customers(full_name)")
      .eq("barbershop_id", barbershop.id)
      .order("current_points", { ascending: false })
      .limit(10),
  ]);
  const { data: redemptions } = await supabase
    .from("loyalty_transactions")
    .select("id,points,description,created_at,customers(full_name)")
    .eq("barbershop_id", barbershop.id)
    .eq("type", "redeemed")
    .order("created_at", { ascending: false })
    .limit(50);
  const accounts = (accountData ?? []) as unknown as Array<{
    current_points: number;
    customers: { full_name: string } | null;
  }>;
  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <Gift className="h-4 w-4" /> Fidelidade
        </Badge>
        <h1 className="mt-3 text-3xl font-black text-white">
          Programa de fidelidade
        </h1>
      </div>
      <Card>
        <CardTitle>Regra principal</CardTitle>
        <ActionForm
          action={updateLoyaltyProgram}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="slug" value={barbershop.slug} />
          <div>
            <Label>Nome</Label>
            <Input name="name" defaultValue={program?.name} required />
          </div>
          <div>
            <Label>Forma de acúmulo</Label>
            <Select name="earning_mode" defaultValue={program?.earning_mode}>
              <option value="visit">Por atendimento</option>
              <option value="amount">Por real gasto</option>
              <option value="service">Por serviço</option>
            </Select>
          </div>
          <div>
            <Label>Pontos por atendimento</Label>
            <Input
              name="points_per_visit"
              type="number"
              min="0"
              defaultValue={program?.points_per_visit ?? 1}
            />
          </div>
          <div>
            <Label>Pontos por R$ 1</Label>
            <Input
              name="points_per_currency"
              type="number"
              min="0"
              step="0.01"
              defaultValue={program?.points_per_currency ?? 1}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-zinc-200">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={program?.is_active}
            />{" "}
            Programa ativo
          </label>
          <div>
            <Button>Salvar programa</Button>
          </div>
        </ActionForm>
      </Card>
      <Card>
        <CardTitle>Pontos por serviço</CardTitle>
        <div className="mt-4 grid gap-3">
          {services?.map((service) => (
            <ActionForm
              key={service.id}
              action={saveServicePoints}
              className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-end"
            >
              <input type="hidden" name="slug" value={barbershop.slug} />
              <input type="hidden" name="service_id" value={service.id} />
              <div>
                <Label>Serviço</Label>
                <p className="py-3 text-white">{service.name}</p>
              </div>
              <div>
                <Label>Pontos</Label>
                <Input
                  name="points_earned"
                  type="number"
                  min="0"
                  defaultValue={
                    rules?.find((rule) => rule.service_id === service.id)
                      ?.points_earned ?? 0
                  }
                />
              </div>
              <Button>Salvar</Button>
            </ActionForm>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Nova recompensa</CardTitle>
        <RewardForm slug={barbershop.slug} services={services ?? []} />
        <div className="mt-5 grid gap-4">
          {rewards?.map((reward) => (
            <details
              key={reward.id}
              className="rounded-xl border border-white/10 p-4"
            >
              <summary className="cursor-pointer text-zinc-200">
                {reward.name} • {reward.points_cost} pontos •{" "}
                {reward.is_active ? "Ativa" : "Inativa"}
              </summary>
              <RewardForm
                slug={barbershop.slug}
                services={services ?? []}
                reward={reward}
              />
            </details>
          ))}
        </div>
      </Card>
      <Card>
        <CardTitle>Maiores saldos</CardTitle>
        <div className="mt-4 grid gap-2">
          {accounts?.map((account, index) => (
            <p
              key={index}
              className="flex justify-between border-b border-white/10 py-2 text-sm text-zinc-300"
            >
              <span>{account.customers?.full_name || "Cliente"}</span>
              <strong>{account.current_points} pontos</strong>
            </p>
          ))}
          {!accounts?.length && (
            <CardDescription>Nenhum saldo registrado.</CardDescription>
          )}
        </div>
      </Card>
      <Card>
        <CardTitle>Últimos resgates</CardTitle>
        <CardDescription>
          Entregue a recompensa ao cliente no estabelecimento. O resgate
          desconta os pontos e fica registrado no extrato.
        </CardDescription>
        <div className="mt-4 grid gap-3">
          {redemptions?.map((item) => (
            <p key={item.id} className="text-sm text-zinc-300">
              {(item.customers as unknown as { full_name: string })?.full_name}{" "}
              • {item.description} • {item.points} pontos •{" "}
              {new Date(item.created_at).toLocaleDateString("pt-BR", {
                timeZone: barbershop.timezone,
              })}
            </p>
          ))}
          {!redemptions?.length && (
            <p className="text-zinc-400">Nenhum resgate registrado.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

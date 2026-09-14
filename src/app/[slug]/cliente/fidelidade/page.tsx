import { ActionForm } from "@/components/forms/ActionForm";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";
import { requireBarbershop } from "@/features/tenancy/server";
import { redeemReward as redeemRewardResult } from "@/features/loyalty/customer-actions";
import { asFormAction } from "@/lib/actions/form-action";

const redeemReward = asFormAction(redeemRewardResult);

export default async function CustomerLoyaltyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user } = await exigirPerfilCompleto(slug);
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("barbershop_id", barbershop.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  const results = customer
    ? await Promise.all([
        supabase
          .from("loyalty_accounts")
          .select("*")
          .eq("barbershop_id", barbershop.id)
          .eq("customer_id", customer.id)
          .maybeSingle(),
        supabase
          .from("loyalty_rewards")
          .select("*")
          .eq("barbershop_id", barbershop.id)
          .eq("is_active", true)
          .order("points_cost"),
        supabase
          .from("loyalty_transactions")
          .select("*")
          .eq("barbershop_id", barbershop.id)
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("loyalty_programs")
          .select("*")
          .eq("barbershop_id", barbershop.id)
          .eq("is_active", true)
          .maybeSingle(),
      ])
    : null;

  const account = results?.[0].data;
  const rewards = results?.[1].data ?? [];
  const transactions = results?.[2].data ?? [];
  const program = results?.[3].data;
  const points = account?.current_points ?? 0;
  const nextReward =
    rewards.find((reward) => reward.points_cost > points) ?? rewards[0];
  const progress = nextReward
    ? Math.min(100, Math.round((points / nextReward.points_cost) * 100))
    : 0;

  return (
    <div className="grid gap-4">
      <div>
        <Badge>
          <Gift className="h-3.5 w-3.5" /> Fidelidade
        </Badge>
        <h1 className="mt-3 text-2xl font-black text-white">
          {program?.name ?? "Programa de fidelidade"}
        </h1>
      </div>
      {!program && (
        <Card>
          <CardDescription>
            O programa de fidelidade ainda não está ativo nesta barbearia.
          </CardDescription>
        </Card>
      )}
      {program && (
        <>
          <Card>
            <CardTitle>{points} pontos</CardTitle>
            <CardDescription>
              {nextReward
                ? `Próxima recompensa: ${nextReward.name} (${nextReward.points_cost} pontos)`
                : "Continue acumulando pontos."}
            </CardDescription>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-brand-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>Recompensas</CardTitle>
            <div className="mt-4 grid gap-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"
                >
                  <div>
                    <strong className="text-white">{reward.name}</strong>
                    <p className="text-sm text-zinc-400">
                      {reward.points_cost} pontos
                    </p>
                  </div>
                  <ActionForm action={redeemReward}>
                    <input type="hidden" name="slug" value={barbershop.slug} />
                    <input type="hidden" name="reward_id" value={reward.id} />
                    <Button disabled={points < reward.points_cost}>
                      Resgatar
                    </Button>
                  </ActionForm>
                </div>
              ))}
              {!rewards.length && (
                <CardDescription>
                  Nenhuma recompensa cadastrada.
                </CardDescription>
              )}
            </div>
          </Card>
          <Card>
            <CardTitle>Extrato</CardTitle>
            <div className="mt-4 grid gap-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between border-b border-white/10 py-3 text-sm text-zinc-300"
                >
                  <span>{transaction.description}</span>
                  <strong
                    className={
                      transaction.points > 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  >
                    {transaction.points > 0 ? "+" : ""}
                    {transaction.points}
                  </strong>
                </div>
              ))}
              {!transactions.length && (
                <CardDescription>Nenhum lançamento ainda.</CardDescription>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

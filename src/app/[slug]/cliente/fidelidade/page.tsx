import {
  Gift,
  Sparkles,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { redeemReward as redeemRewardResult } from "@/features/loyalty/customer-actions";
import { requireBarbershop } from "@/features/tenancy/server";
import { asFormAction } from "@/lib/actions/form-action";
import { exigirPerfilCompleto } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

const redeemReward =
  asFormAction(
    redeemRewardResult,
  );

export default async function CustomerLoyaltyPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const barbershop =
    await requireBarbershop(slug);

  const { user } =
    await exigirPerfilCompleto(
      slug,
    );

  const supabase =
    await createClient();

  const { data: customer } =
    await supabase
      .from("customers")
      .select("id")
      .eq(
        "barbershop_id",
        barbershop.id,
      )
      .eq(
        "profile_id",
        user.id,
      )
      .maybeSingle();

  const results =
    customer
      ? await Promise.all([
          supabase
            .from(
              "loyalty_accounts",
            )
            .select("*")
            .eq(
              "barbershop_id",
              barbershop.id,
            )
            .eq(
              "customer_id",
              customer.id,
            )
            .maybeSingle(),

          supabase
            .from(
              "loyalty_rewards",
            )
            .select("*")
            .eq(
              "barbershop_id",
              barbershop.id,
            )
            .eq(
              "is_active",
              true,
            )
            .order(
              "points_cost",
            ),

          supabase
            .from(
              "loyalty_transactions",
            )
            .select("*")
            .eq(
              "barbershop_id",
              barbershop.id,
            )
            .eq(
              "customer_id",
              customer.id,
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            )
            .limit(20),

          supabase
            .from(
              "loyalty_programs",
            )
            .select("*")
            .eq(
              "barbershop_id",
              barbershop.id,
            )
            .eq(
              "is_active",
              true,
            )
            .maybeSingle(),
        ])
      : null;

  const account =
    results?.[0].data;

  const rewards =
    results?.[1].data ??
    [];

  const transactions =
    results?.[2].data ??
    [];

  const program =
    results?.[3].data;

  const points =
    account?.current_points ??
    0;

  const nextReward =
    rewards.find(
      (reward) =>
        reward.points_cost >
        points,
    ) ??
    rewards[0];

  const progress =
    nextReward
      ? Math.min(
          100,
          Math.round(
            (points /
              nextReward.points_cost) *
              100,
          ),
        )
      : 0;

  return (
    <div className="grid gap-5">
      <div>
        <Badge>
          <Gift className="h-3.5 w-3.5" />
          Fidelidade
        </Badge>

        <h1 className="ui-h2 mt-4 font-extrabold text-[var(--text)]">
          {program?.name ??
            "Programa de fidelidade"}
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
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--text-muted)]">
                  Saldo atual
                </p>

                <p className="mt-1 text-4xl font-extrabold text-[var(--text)]">
                  {points}
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
                  pontos
                </p>
              </div>

              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--tenant-accent-soft)] text-[var(--tenant-accent)]">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>

            <CardDescription className="mt-5">
              {nextReward
                ? `Próxima recompensa: ${nextReward.name} (${nextReward.points_cost} pontos)`
                : "Continue acumulando pontos."}
            </CardDescription>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#ECE7DE]">
              <div
                className="h-full rounded-full bg-[var(--tenant-accent)] transition-[width] duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </Card>

          <Card>
            <CardTitle>
              Recompensas
            </CardTitle>

            <div className="mt-4 grid gap-3">
              {rewards.map(
                (reward) => (
                  <div
                    key={
                      reward.id
                    }
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[#FAF8F4] p-4"
                  >
                    <div>
                      <strong className="text-[var(--text)]">
                        {
                          reward.name
                        }
                      </strong>

                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {
                          reward.points_cost
                        }{" "}
                        pontos
                      </p>
                    </div>

                    <ActionForm
                      action={
                        redeemReward
                      }
                    >
                      <input
                        type="hidden"
                        name="slug"
                        value={
                          barbershop.slug
                        }
                      />

                      <input
                        type="hidden"
                        name="reward_id"
                        value={
                          reward.id
                        }
                      />

                      <Button
                        disabled={
                          points <
                          reward.points_cost
                        }
                      >
                        Resgatar
                      </Button>
                    </ActionForm>
                  </div>
                ),
              )}

              {!rewards.length && (
                <CardDescription>
                  Nenhuma recompensa cadastrada.
                </CardDescription>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>
              Extrato
            </CardTitle>

            <div className="mt-4 grid gap-1">
              {transactions.map(
                (
                  transaction,
                ) => (
                  <div
                    key={
                      transaction.id
                    }
                    className="flex justify-between gap-4 border-b border-[var(--border)] py-3 text-sm text-[var(--text-muted)]"
                  >
                    <span>
                      {
                        transaction.description
                      }
                    </span>

                    <strong
                      className={
                        transaction.points >
                        0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {transaction.points >
                      0
                        ? "+"
                        : ""}
                      {
                        transaction.points
                      }
                    </strong>
                  </div>
                ),
              )}

              {!transactions.length && (
                <CardDescription>
                  Nenhum lançamento ainda.
                </CardDescription>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

import { ActionForm } from "@/components/forms/ActionForm";
import { createLoyaltyReward } from "@/features/loyalty/actions";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { LoyaltyReward } from "@/lib/db/types";

export function RewardForm({
  slug,
  services,
  reward,
}: {
  slug: string;
  services: { id: string; name: string }[];
  reward?: LoyaltyReward;
}) {
  return (
    <ActionForm
      action={createLoyaltyReward}
      className="mt-5 grid gap-4 md:grid-cols-2"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={reward?.id ?? ""} />
      <div>
        <Label>Nome</Label>
        <Input name="name" required defaultValue={reward?.name} />
      </div>
      <div>
        <Label>Custo em pontos</Label>
        <Input
          name="points_cost"
          type="number"
          min="1"
          required
          defaultValue={reward?.points_cost}
        />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select name="reward_type" defaultValue={reward?.reward_type ?? "gift"}>
          <option value="free_service">Serviço grátis</option>
          <option value="fixed_discount">Desconto fixo</option>
          <option value="percentage_discount">Desconto percentual</option>
          <option value="gift">Brinde</option>
          <option value="custom">Personalizada</option>
        </Select>
      </div>
      <div>
        <Label>Serviço (obrigatório para serviço grátis)</Label>
        <Select name="service_id" defaultValue={reward?.service_id ?? ""}>
          <option value="">Nenhum</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Valor do desconto (R$ ou %)</Label>
        <Input
          name="discount_value"
          type="number"
          min="0"
          step="0.01"
          defaultValue={reward?.discount_value ?? ""}
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={reward?.is_active ?? true}
        />
        Recompensa ativa
      </label>
      <div>
        <Button>{reward ? "Salvar recompensa" : "Cadastrar recompensa"}</Button>
      </div>
    </ActionForm>
  );
}

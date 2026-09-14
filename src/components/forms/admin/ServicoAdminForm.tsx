import { ImageField } from "@/components/forms/ImageField";
import { ActionForm } from "@/components/forms/ActionForm";
import {
  criarServico,
  atualizarServico,
  alternarStatusServico,
} from "@/lib/admin/actions";
import { asFormAction } from "@/lib/actions/form-action";
import type { Service } from "@/lib/db/types";
import { BotaoSubmit } from "@/components/forms/BotaoSubmit";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

type ServicoAdminFormProps = {
  servico?: Service;
  slug?: string;
};

export function ServicoAdminForm({
  servico,
  slug = "sevilha",
}: ServicoAdminFormProps) {
  const editando = Boolean(servico?.id);
  const action = asFormAction(editando ? atualizarServico : criarServico);

  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {servico?.id && <input type="hidden" name="id" value={servico.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`name-${servico?.id ?? "novo"}`}>
            Nome do serviço
          </Label>
          <Input
            id={`name-${servico?.id ?? "novo"}`}
            name="name"
            defaultValue={servico?.name ?? ""}
            placeholder="Ex.: Corte masculino"
            required
          />
        </div>

        <div>
          <Label htmlFor={`price-${servico?.id ?? "novo"}`}>Preço</Label>
          <Input
            id={`price-${servico?.id ?? "novo"}`}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={servico?.price ?? ""}
            placeholder="45.00"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`duration-${servico?.id ?? "novo"}`}>
            Duração em minutos
          </Label>
          <Input
            id={`duration-${servico?.id ?? "novo"}`}
            name="duration_minutes"
            type="number"
            min="5"
            step="5"
            defaultValue={servico?.duration_minutes ?? 30}
            required
          />
        </div>

        <div>
          <Label htmlFor={`image-${servico?.id ?? "novo"}`}>
            URL da imagem
          </Label>
          <ImageField
            name="image_url"
            defaultValue={servico?.image_url ?? ""}
            slug={slug}
            category="services"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`description-${servico?.id ?? "novo"}`}>
          Descrição
        </Label>
        <Textarea
          id={`description-${servico?.id ?? "novo"}`}
          name="description"
          defaultValue={servico?.description ?? ""}
          placeholder="Descreva o serviço para o cliente."
          rows={3}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={servico?.is_active ?? true}
          className="h-4 w-4 rounded border-white/20 bg-zinc-900"
        />
        Serviço ativo e visível para reservas
      </label>

      <div className="flex flex-wrap gap-3">
        <BotaoSubmit
          texto={editando ? "Salvar alterações" : "Cadastrar serviço"}
        />
      </div>
    </ActionForm>
  );
}

export function AlternarStatusServicoForm({
  servico,
  slug = "sevilha",
}: {
  servico: Service;
  slug?: string;
}) {
  const proximoStatus = !servico.is_active;

  return (
    <ActionForm action={asFormAction(alternarStatusServico)}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={servico.id} />
      <input type="hidden" name="is_active" value={String(proximoStatus)} />
      <Button
        type="submit"
        variant={servico.is_active ? "danger" : "secondary"}
      >
        {servico.is_active ? "Desativar" : "Ativar"}
      </Button>
    </ActionForm>
  );
}

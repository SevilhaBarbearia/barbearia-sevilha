import { Clock3, ImageIcon, Plus, Scissors } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/server';
import { formatarMoeda } from '@/lib/utils';
import { AlternarStatusServicoForm, ServicoAdminForm } from '@/components/forms/admin/ServicoAdminForm';
import type { Service } from '@/lib/db/types';

export default async function ServicosAdminPage() {
  const supabase = await createClient();

  const { data: servicos, error } = await supabase
    .from('services')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name');

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge><Scissors className="h-3.5 w-3.5" /> Catálogo</Badge>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Gerenciar serviços</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">
            Cadastre, edite preço, duração, imagem e status dos serviços que aparecem na reserva.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08]">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 sm:h-12 sm:w-12 sm:rounded-2xl text-brand-950 shadow-button">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Novo serviço</CardTitle>
            <CardDescription>Preencha os dados abaixo para disponibilizar um novo serviço aos clientes.</CardDescription>
          </div>
        </div>
        <div className="mt-6">
          <ServicoAdminForm />
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardTitle>Erro ao carregar serviços</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </Card>
      )}

      <div className="grid gap-4">
        {((servicos ?? []) as Service[]).map((servico) => (
          <Card key={servico.id} className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[260px_1fr]">
              <div
                className="relative min-h-40 bg-gradient-to-br sm:min-h-56 from-brand-950 via-zinc-950 to-black"
                style={servico.image_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,7,6,0.05), rgba(8,7,6,0.78)), url(${servico.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!servico.image_url && (
                  <div className="grid h-full place-items-center grade-barbearia">
                    <span className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-[1.35rem] sm:rounded-[2rem] border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-premium">
                      <ImageIcon className="h-9 w-9" />
                    </span>
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-brand-100 backdrop-blur">
                  {servico.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start">
                  <div>
                    <CardTitle>{servico.name}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>{formatarMoeda(Number(servico.price))}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {servico.duration_minutes} min</span>
                    </CardDescription>
                  </div>
                  <AlternarStatusServicoForm servico={servico} />
                </div>

                <ServicoAdminForm servico={servico} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {servicos?.length === 0 && (
        <Card>
          <CardDescription>Nenhum serviço cadastrado ainda.</CardDescription>
        </Card>
      )}
    </div>
  );
}

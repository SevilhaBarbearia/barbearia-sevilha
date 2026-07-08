import { ImageIcon, Plus, Scissors, UsersRound } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/server';
import { AlternarStatusBarbeiroForm, BarbeiroAdminForm } from '@/components/forms/admin/BarbeiroAdminForm';
import type { Barber, Service } from '@/lib/db/types';

type BarbeiroComServicos = Barber & {
  barber_services?: Array<{ service_id: string; is_active: boolean }> | null;
};

export default async function BarbeirosAdminPage() {
  const supabase = await createClient();

  const [{ data: barbeiros, error: barbeirosError }, { data: servicos, error: servicosError }] = await Promise.all([
    supabase
      .from('barbers')
      .select('*, barber_services(service_id, is_active)')
      .order('is_active', { ascending: false })
      .order('name'),
    supabase
      .from('services')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name')
  ]);

  const servicosLista = (servicos ?? []) as Service[];

  return (
    <div className="grid gap-4 sm:gap-5">
      <div>
        <Badge><UsersRound className="h-3.5 w-3.5" /> Equipe</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Gerenciar barbeiros</h1>
        <p className="mt-2 max-w-2xl text-zinc-300">
          Cadastre barbeiros, informe dados de contato, foto e vincule quais serviços cada um realiza.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08]">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 sm:h-12 sm:w-12 sm:rounded-2xl text-brand-950 shadow-button">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Novo barbeiro</CardTitle>
            <CardDescription>Depois de cadastrar, ele já pode aparecer na tela de reserva se estiver ativo.</CardDescription>
          </div>
        </div>
        <div className="mt-6">
          <BarbeiroAdminForm servicos={servicosLista} />
        </div>
      </Card>

      {(barbeirosError || servicosError) && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardTitle>Erro ao carregar dados</CardTitle>
          <CardDescription>{barbeirosError?.message ?? servicosError?.message}</CardDescription>
        </Card>
      )}

      <div className="grid gap-4">
        {((barbeiros ?? []) as BarbeiroComServicos[]).map((barbeiro) => (
          <Card key={barbeiro.id} className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[260px_1fr]">
              <div
                className="relative min-h-44 bg-gradient-to-br sm:min-h-72 from-brand-950 via-zinc-950 to-black"
                style={barbeiro.photo_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,7,6,0.05), rgba(8,7,6,0.78)), url(${barbeiro.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!barbeiro.photo_url && (
                  <div className="grid h-full place-items-center grade-barbearia">
                    <span className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-[1.35rem] sm:rounded-[2rem] border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-premium">
                      <ImageIcon className="h-9 w-9" />
                    </span>
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-brand-100 backdrop-blur">
                  {barbeiro.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start">
                  <div>
                    <CardTitle>{barbeiro.name}</CardTitle>
                    <CardDescription>
                      {barbeiro.phone ? `Telefone: ${barbeiro.phone} • ` : ''}
                      {barbeiro.bio ?? 'Biografia ainda não cadastrada.'}
                    </CardDescription>
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-zinc-300">
                      <Scissors className="h-3.5 w-3.5 text-brand-100" /> {barbeiro.barber_services?.filter((item) => item.is_active).length ?? 0} serviços vinculados
                    </p>
                  </div>
                  <AlternarStatusBarbeiroForm barbeiro={barbeiro} />
                </div>

                <BarbeiroAdminForm barbeiro={barbeiro} servicos={servicosLista} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {barbeiros?.length === 0 && (
        <Card>
          <CardDescription>Nenhum barbeiro cadastrado ainda.</CardDescription>
        </Card>
      )}
    </div>
  );
}

import { ImageIcon, Plus, Scissors, UsersRound } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/server';
import { AlternarStatusBarbeiroForm, BarbeiroAdminForm } from '@/components/forms/admin/BarbeiroAdminForm';
import type { Barber, BusinessHour, Service } from '@/lib/db/types';

type BarbeiroComServicos = Barber & {
  barber_services?: Array<{ service_id: string; is_active: boolean }> | null;
};

function horarioPadraoDoBarbeiro(horarios: BusinessHour[], barberId: string) {
  // A tela não lista expediente por dia. Pegamos o primeiro expediente útil
  // do barbeiro apenas para preencher o formulário de edição.
  return (
    horarios.find((horario) => horario.barber_id === barberId && horario.day_of_week === 1) ??
    horarios.find((horario) => horario.barber_id === barberId && horario.day_of_week >= 1 && horario.day_of_week <= 6) ??
    null
  );
}

export default async function BarbeirosAdminPage() {
  const supabase = await createClient();

  const [barbeirosResult, servicosResult, horariosResult] = await Promise.all([
    supabase
      .from('barbers')
      .select('*, barber_services(service_id, is_active)')
      .order('is_active', { ascending: false })
      .order('name'),
    supabase
      .from('services')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name'),
    supabase
      .from('business_hours')
      .select('*')
      .in('day_of_week', [1, 2, 3, 4, 5, 6])
      .order('day_of_week')
  ]);

  const barbeiros = (barbeirosResult.data ?? []) as BarbeiroComServicos[];
  const servicosLista = (servicosResult.data ?? []) as Service[];
  const horariosLista = (horariosResult.data ?? []) as BusinessHour[];

  return (
    <div className="grid gap-4 sm:gap-5">
      <div>
        <Badge><UsersRound className="h-3.5 w-3.5" /> Equipe</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">Gerenciar barbeiros</h1>
        <p className="mt-2 max-w-2xl text-zinc-300">
          Cadastre barbeiros, informe dados de contato, expediente, intervalo e vincule quais serviços cada um realiza.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white/[0.08] to-brand-500/[0.08]">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-brand-950 shadow-button sm:h-12 sm:w-12 sm:rounded-2xl">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Novo barbeiro</CardTitle>
            <CardDescription>
              Ao cadastrar, informe o expediente padrão. Ele será aplicado de segunda a sábado; domingo fica fechado.
            </CardDescription>
          </div>
        </div>
        <div className="mt-6">
          <BarbeiroAdminForm servicos={servicosLista} />
        </div>
      </Card>

      {(barbeirosResult.error || servicosResult.error || horariosResult.error) && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardTitle>Erro ao carregar dados</CardTitle>
          <CardDescription>
            {barbeirosResult.error?.message ?? servicosResult.error?.message ?? horariosResult.error?.message}
          </CardDescription>
        </Card>
      )}

      <div className="grid gap-4">
        {barbeiros.map((barbeiro) => {
          const horarioPadrao = horarioPadraoDoBarbeiro(horariosLista, barbeiro.id);

          return (
            <Card key={barbeiro.id} className="overflow-hidden p-0">
              <div className="grid lg:grid-cols-[260px_1fr]">
                <div
                  className="relative min-h-44 bg-gradient-to-br from-brand-950 via-zinc-950 to-black sm:min-h-72"
                  style={barbeiro.photo_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,7,6,0.05), rgba(8,7,6,0.78)), url(${barbeiro.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!barbeiro.photo_url && (
                    <div className="grid h-full place-items-center grade-barbearia">
                      <span className="grid h-16 w-16 place-items-center rounded-[1.35rem] border border-brand-500/40 bg-brand-500/12 text-brand-100 shadow-premium sm:h-20 sm:w-20 sm:rounded-[2rem]">
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-zinc-300">
                          <Scissors className="h-3.5 w-3.5 text-brand-100" /> {barbeiro.barber_services?.filter((item) => item.is_active).length ?? 0} serviços vinculados
                        </p>
                        <p className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-100">
                          {horarioPadrao ? `${horarioPadrao.start_time.slice(0, 5)} às ${horarioPadrao.end_time.slice(0, 5)}` : 'Expediente padrão não localizado'}
                        </p>
                      </div>
                    </div>
                    <AlternarStatusBarbeiroForm barbeiro={barbeiro} />
                  </div>

                  <BarbeiroAdminForm barbeiro={barbeiro} servicos={servicosLista} horarioPadrao={horarioPadrao} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {barbeiros.length === 0 && (
        <Card>
          <CardDescription>Nenhum barbeiro cadastrado ainda.</CardDescription>
        </Card>
      )}
    </div>
  );
}

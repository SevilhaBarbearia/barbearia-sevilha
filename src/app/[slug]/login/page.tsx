import { redirect } from "next/navigation";

import { LoginGoogleButton } from "@/components/forms/LoginGoogleButton";
import { Logo } from "@/components/brand/Logo";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await obterUsuarioAtual();

  if (user && profile?.phone) {
    redirect(`/${barbershop.slug}/reservar`);
  }

  if (user) {
    redirect(`/${barbershop.slug}/completar-cadastro`);
  }

  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name,logo_url")
    .eq("barbershop_id", barbershop.id)
    .maybeSingle();

  const brandName = settings?.business_name || barbershop.name;
  const logoUrl = settings?.logo_url || barbershop.logo_url;

  return (
    <main className="ui-barber-ambient fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="ui-public-brand-panel rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-lg shadow-black/10 backdrop-blur-sm">
          <Logo
            href={`/${barbershop.slug}`}
            name={brandName}
            logoUrl={logoUrl}
            publicSurface
          />
        </div>

        <Card className="mt-5">
          <CardTitle>
            Entrar para reservar
          </CardTitle>

          <CardDescription>
            Use sua conta Google para acessar seus horários com segurança.
          </CardDescription>

          <div className="mt-8">
            <LoginGoogleButton slug={barbershop.slug} />
          </div>
        </Card>
      </div>
    </main>
  );
}

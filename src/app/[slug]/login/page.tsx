import { redirect } from "next/navigation";
import { LoginGoogleButton } from "@/components/forms/LoginGoogleButton";
import { Logo } from "@/components/brand/Logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { obterUsuarioAtual } from "@/lib/auth/permissoes";
import { requireBarbershop } from "@/features/tenancy/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await obterUsuarioAtual();
  if (user && profile?.phone) redirect(`/${barbershop.slug}/reservar`);
  if (user) redirect(`/${barbershop.slug}/completar-cadastro`);

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo
          href={`/${barbershop.slug}`}
          name={barbershop.name}
          logoUrl={barbershop.logo_url}
        />
        <Card className="mt-8">
          <CardTitle>Entrar para reservar</CardTitle>
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

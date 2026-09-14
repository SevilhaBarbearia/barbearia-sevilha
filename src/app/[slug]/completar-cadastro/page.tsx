import { CompletarCadastroForm } from "@/components/forms/CompletarCadastroForm";
import { Logo } from "@/components/brand/Logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { exigirUsuario } from "@/lib/auth/permissoes";
import { requireBarbershop } from "@/features/tenancy/server";

export default async function CompletarCadastroPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barbershop = await requireBarbershop(slug);
  const { user, profile } = await exigirUsuario(slug);

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo
          href={`/${barbershop.slug}`}
          name={barbershop.name}
          logoUrl={barbershop.logo_url}
        />
        <Card className="mt-8">
          <CardTitle>Complete seu cadastro</CardTitle>
          <CardDescription>
            Esses dados serão usados somente no relacionamento com{" "}
            {barbershop.name}.
          </CardDescription>
          <div className="mt-8">
            <CompletarCadastroForm
              slug={barbershop.slug}
              nome={profile?.full_name ?? user.user_metadata?.name}
              email={profile?.email ?? user.email}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}

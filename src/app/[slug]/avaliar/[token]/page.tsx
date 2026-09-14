import { FeedbackForm } from "@/components/forms/FeedbackForm";
import { Logo } from "@/components/brand/Logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { requireBarbershop } from "@/features/tenancy/server";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const barbershop = await requireBarbershop(slug);

  return (
    <main className="fundo-premium grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Logo
          href={`/${barbershop.slug}`}
          name={barbershop.name}
          logoUrl={barbershop.logo_url}
        />
        <Card className="mt-8">
          <CardTitle>Como foi seu atendimento?</CardTitle>
          <CardDescription>
            Sua resposta ajuda a {barbershop.name} a melhorar continuamente.
          </CardDescription>
          <div className="mt-8">
            <FeedbackForm token={token} />
          </div>
        </Card>
      </div>
    </main>
  );
}

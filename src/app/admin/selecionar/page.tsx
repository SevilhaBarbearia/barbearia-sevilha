import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { listManagedBarbershops } from "@/features/tenancy/server";

export default async function SelectBarbershopPage() {
  const barbershops = await listManagedBarbershops();
  return (
    <main className="fundo-premium min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-white">
          Selecione a barbearia
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {barbershops.map((barbershop) => (
            <Link key={barbershop.id} href={`/admin/${barbershop.slug}`}>
              <Card className="h-full hover:border-brand-500/40">
                <CardTitle>{barbershop.name}</CardTitle>
                <CardDescription>/{barbershop.slug}</CardDescription>
              </Card>
            </Link>
          ))}
          {!barbershops.length && (
            <Card>
              <CardDescription>
                Esta conta não possui uma barbearia vinculada.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

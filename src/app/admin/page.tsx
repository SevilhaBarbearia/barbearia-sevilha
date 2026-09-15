import { redirect } from "next/navigation";

import { listManagedBarbershops } from "@/features/tenancy/server";

export default async function AdminPage() {
  const barbershops =
    await listManagedBarbershops();

  if (barbershops.length === 1) {
    redirect(
      `/admin/${barbershops[0].slug}`,
    );
  }

  if (barbershops.length > 1) {
    /*
     * Só aparece para uma conta explicitamente vinculada a mais de um tenant
     * ou para o administrador da plataforma.
     */
    redirect("/admin/selecionar");
  }

  redirect(
    "/admin/login?erro=sem-barbearia",
  );
}

import { createClient } from "@/lib/supabase/server";
import { gerarPaletaMarca, type PaletaMarca } from "./paleta-marca";

// Eu só consulto identidade visual quando conheço explicitamente o tenant.
export async function obterPaletaDoTenant(
  barbershopId?: string,
): Promise<PaletaMarca> {
  if (!barbershopId) {
    return gerarPaletaMarca();
  }

  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("barbershops")
      .select("primary_color")
      .eq("id", barbershopId)
      .maybeSingle();

    return gerarPaletaMarca(data?.primary_color);
  } catch {
    return gerarPaletaMarca();
  }
}

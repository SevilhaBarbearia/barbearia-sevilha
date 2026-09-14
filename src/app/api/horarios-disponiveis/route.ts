import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  data: z.string().date(),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function GET(request: Request) {
  const parsed = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { horarios: [], erro: "Informe uma data válida e os dados da reserva." },
      { status: 400 },
    );
  try {
    const supabase = await createClient();
    const { data: shop, error: shopError } = await supabase
      .from("barbershops")
      .select("id")
      .eq("slug", parsed.data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (shopError) throw shopError;
    if (!shop) return NextResponse.json({ horarios: [] }, { status: 404 });
    // Eu calculo a disponibilidade no fuso da barbearia, independentemente do servidor.
    const { data, error } = await supabase.rpc("available_slots", {
      tenant: shop.id,
      barber: parsed.data.barberId,
      service: parsed.data.serviceId,
      day: parsed.data.data,
    });
    if (error) throw error;
    return NextResponse.json({ horarios: data ?? [] });
  } catch {
    return NextResponse.json(
      {
        horarios: [],
        erro: "Não foi possível consultar os horários. Tente novamente.",
      },
      { status: 503 },
    );
  }
}

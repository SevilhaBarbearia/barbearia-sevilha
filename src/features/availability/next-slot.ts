import { unstable_cache } from "next/cache";

import { getAvailabilityCacheTag } from "@/features/availability/cache";
import { createPublicServerClient } from "@/lib/supabase/public-server";

type BarberRow = {
  id: string;
  name: string;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
};

type BarberServiceRow = {
  barber_id: string;
  service_id: string;
};

type AvailableSlotRow = {
  startAt: string;
  endAt: string;
  label: string;
};

type Candidate = {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
};

export type NextAvailableSlot = {
  startAt: string;
  endAt: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
};

type NextSlotInput = {
  barbershopId: string;
  timezone: string;
};

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function calendarDate(
  base: { year: number; month: number; day: number },
  offset: number,
) {
  const value = new Date(
    Date.UTC(base.year, base.month - 1, base.day + offset, 12, 0, 0),
  );

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildCandidates(
  barbers: BarberRow[],
  services: ServiceRow[],
  links: BarberServiceRow[],
) {
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const barberById = new Map(barbers.map((barber) => [barber.id, barber]));

  const shortestByBarber = new Map<string, Candidate>();

  for (const link of links) {
    const barber = barberById.get(link.barber_id);
    const service = serviceById.get(link.service_id);

    if (!barber || !service) continue;

    const candidate: Candidate = {
      barberId: barber.id,
      barberName: barber.name,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.duration_minutes,
    };

    const current = shortestByBarber.get(barber.id);

    if (!current || candidate.durationMinutes < current.durationMinutes) {
      shortestByBarber.set(barber.id, candidate);
    }
  }

  return Array.from(shortestByBarber.values());
}

async function loadNextAvailableSlot({
  barbershopId,
  timezone,
}: NextSlotInput): Promise<NextAvailableSlot | null> {
  try {
    const supabase = createPublicServerClient();

    const [
      { data: barbersData, error: barbersError },
      { data: servicesData, error: servicesError },
      { data: linksData, error: linksError },
      { data: settingsData },
    ] = await Promise.all([
      supabase
        .from("barbers")
        .select("id,name")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("services")
        .select("id,name,duration_minutes")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("duration_minutes"),
      supabase
        .from("barber_services")
        .select("barber_id,service_id")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true),
      supabase
        .from("business_settings")
        .select("booking_advance_days")
        .eq("barbershop_id", barbershopId)
        .maybeSingle(),
    ]);

    if (barbersError || servicesError || linksError) {
      return null;
    }

    const barbers = (barbersData ?? []) as BarberRow[];
    const services = (servicesData ?? []) as ServiceRow[];
    const links = (linksData ?? []) as BarberServiceRow[];

    const candidates = buildCandidates(barbers, services, links);

    if (!candidates.length) {
      return null;
    }

    const configuredAdvance = Number(settingsData?.booking_advance_days ?? 30);

    // Eu limito a varredura pública para não transformar a Home em uma consulta pesada.
    // O fluxo de reserva continua respeitando todo o limite configurado pelo tenant.
    const searchDays = Math.max(1, Math.min(configuredAdvance, 45));
    const baseDate = dateInTimezone(timezone);

    for (let offset = 0; offset < searchDays; offset += 1) {
      const day = calendarDate(baseDate, offset);

      const results = await Promise.all(
        candidates.map(async (candidate) => {
          const { data, error } = await supabase.rpc("available_slots", {
            tenant: barbershopId,
            barber: candidate.barberId,
            service: candidate.serviceId,
            day,
          });

          if (error || !data?.length) {
            return null;
          }

          const slot = (data as AvailableSlotRow[])[0];

          if (!slot?.startAt || !slot?.endAt) {
            return null;
          }

          return {
            startAt: slot.startAt,
            endAt: slot.endAt,
            barberId: candidate.barberId,
            barberName: candidate.barberName,
            serviceId: candidate.serviceId,
            serviceName: candidate.serviceName,
            durationMinutes: candidate.durationMinutes,
          } satisfies NextAvailableSlot;
        }),
      );

      const available = results
        .filter((item): item is NextAvailableSlot => Boolean(item))
        .sort(
          (first, second) =>
            new Date(first.startAt).getTime() -
            new Date(second.startAt).getTime(),
        );

      if (available[0]) {
        return available[0];
      }
    }

    return null;
  } catch {
    // A Home nunca deve cair porque o indicador de próximo horário falhou.
    return null;
  }
}

export async function getNextAvailableSlot(input: NextSlotInput) {
  const cached = unstable_cache(
    () => loadNextAvailableSlot(input),
    ["tenant-next-available-slot", input.barbershopId, input.timezone],
    {
      revalidate: 30,
      tags: [getAvailabilityCacheTag(input.barbershopId)],
    },
  );

  return cached();
}

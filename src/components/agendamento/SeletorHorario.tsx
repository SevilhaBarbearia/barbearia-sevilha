"use client";

import { useEffect, useState } from "react";

import type { AvailableSlot } from "@/lib/db/types";

export function SeletorHorario({
  barberId,
  serviceId,
  data,
  slug,
  name = "start_at",
  value,
  onValueChange,
}: {
  barberId?: string;
  serviceId?: string;
  data?: string;
  slug: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [horarios, setHorarios] = useState<AvailableSlot[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!barberId || !serviceId || !data) {
      setHorarios([]);
      return;
    }

    const controller = new AbortController();

    setHorarios([]);
    setErro(false);
    setCarregando(true);

    const params = new URLSearchParams({
      barberId,
      serviceId,
      data,
      slug,
    });

    fetch(`/api/horarios-disponiveis?${params}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Falha na consulta");
        }

        return res.json();
      })
      .then((json) => {
        if (!controller.signal.aborted) {
          setHorarios(json.horarios ?? []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHorarios([]);
          setErro(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      });

    return () => controller.abort();
  }, [barberId, serviceId, data, slug]);

  if (!barberId || !serviceId || !data) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-white/75 p-4 text-sm leading-6 text-[var(--text-muted)]">
        Escolha serviço, profissional e data para ver os horários disponíveis.
      </p>
    );
  }

  if (carregando) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--text-muted)]"
      >
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--tenant-accent)] border-r-transparent" />
        Buscando horários disponíveis...
      </div>
    );
  }

  if (erro) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
      >
        Não foi possível consultar a agenda. Selecione a data novamente para
        tentar.
      </p>
    );
  }

  if (horarios.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-white/75 p-4 text-sm leading-6 text-[var(--text-muted)]">
        Nenhum horário disponível para essa data.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4">
      {horarios.map((horario) => {
        const selecionado = value === horario.startAt;

        return (
          <label
            key={horario.startAt}
            className={[
              "group flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 py-3 text-center text-xs font-extrabold transition duration-200 sm:min-h-14 sm:text-sm",
              selecionado
                ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)] shadow-[0_10px_24px_color-mix(in_srgb,var(--tenant-accent)_22%,transparent)]"
                : "border-[var(--border)] bg-white text-[var(--text)] shadow-sm hover:-translate-y-0.5 hover:border-[var(--tenant-accent)] hover:bg-[var(--tenant-accent-soft)]",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              value={horario.startAt}
              checked={selecionado}
              onChange={() => onValueChange?.(horario.startAt)}
              className="sr-only"
              required
            />

            {horario.label}
          </label>
        );
      })}
    </div>
  );
}

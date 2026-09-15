"use client";

import {
  UserX,
  XCircle,
} from "lucide-react";

import { ActionForm } from "@/components/forms/ActionForm";
import { Button } from "@/components/ui/Button";
import {
  cancelAppointmentByManager,
  markAppointmentNoShow,
} from "@/features/appointments/admin-actions";

export function AppointmentOutcomeActions({
  slug,
  appointmentId,
  customerName,
}: {
  slug: string;
  appointmentId: string;
  customerName: string;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div>
        <p className="font-extrabold text-white">
          Cancelamento
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          Use o cancelamento normal quando a reserva foi cancelada. Marque
          no-show somente quando o cliente não compareceu ao horário.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionForm
          action={cancelAppointmentByManager}
          onSubmit={(event) => {
            const confirmed =
              window.confirm(
                `Cancelar a reserva de ${customerName}?`,
              );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="slug"
            value={slug}
          />

          <input
            type="hidden"
            name="appointment_id"
            value={appointmentId}
          />

          <Button
            type="submit"
            variant="secondary"
            className="w-full"
          >
            <XCircle className="h-4 w-4" />
            Cancelar reserva
          </Button>
        </ActionForm>

        <ActionForm
          action={markAppointmentNoShow}
          onSubmit={(event) => {
            const confirmed =
              window.confirm(
                `Confirmar que ${customerName} não compareceu?`,
              );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="slug"
            value={slug}
          />

          <input
            type="hidden"
            name="appointment_id"
            value={appointmentId}
          />

          <Button
            type="submit"
            variant="danger"
            className="w-full"
          >
            <UserX className="h-4 w-4" />
            Marcar no-show
          </Button>
        </ActionForm>
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        O servidor só aceita o no-show depois que o horário agendado já começou.
      </p>
    </div>
  );
}

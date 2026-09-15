import {
  test,
} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fileURLToPath,
} from "node:url";

const root =
  fileURLToPath(
    new URL(
      "..",
      import.meta.url,
    ),
  );

function read(path) {
  return fs.readFileSync(
    `${root}/${path}`,
    "utf8",
  );
}

test(
  "no-show é estruturado e protegido por tenant no banco",
  () => {
    const migration = read(
      "supabase/migrations/028_structured_no_show.sql",
    );

    assert.match(
      migration,
      /status\s*=\s*'no_show'/,
    );

    assert.match(
      migration,
      /no_show_at/,
    );

    assert.match(
      migration,
      /no_show_marked_by/,
    );

    assert.match(
      migration,
      /can_manage_barbershop\s*\(\s*target_barbershop_id\s*\)/,
    );

    assert.match(
      migration,
      /barbershop_id\s*=\s*target_barbershop_id/,
    );

    assert.match(
      migration,
      /APPOINTMENT_NOT_STARTED/,
    );
  },
);

test(
  "agenda administrativa mantém cancelamento comum e no-show separados",
  () => {
    const actions = read(
      "src/components/admin/AppointmentOutcomeActions.tsx",
    );

    assert.match(
      actions,
      /cancelAppointmentByManager/,
    );

    assert.match(
      actions,
      /markAppointmentNoShow/,
    );

    assert.match(
      actions,
      /Cancelar reserva/,
    );

    assert.match(
      actions,
      /Marcar no-show/,
    );
  },
);

test(
  "cliente enxerga explicitamente o cancelamento por no-show",
  () => {
    const page = read(
      "src/app/[slug]/cliente/agendamentos/page.tsx",
    );

    assert.match(
      page,
      /Cancelado · No-show/,
    );

    assert.match(
      page,
      /Cancelado por não comparecimento/,
    );

    assert.match(
      page,
      /no_show_at/,
    );
  },
);

test(
  "readiness verifica funções e metadados de no-show",
  () => {
    const readiness = read(
      "supabase/verification/release_readiness.sql",
    );

    assert.match(
      readiness,
      /mark_appointment_no_show/,
    );

    assert.match(
      readiness,
      /cancel_appointment_by_manager/,
    );

    assert.match(
      readiness,
      /no_show_without_metadata/,
    );
  },
);

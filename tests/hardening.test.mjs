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

test(
  "security headers essenciais permanecem configurados",
  () => {
    const source =
      fs.readFileSync(
        root +
          "/next.config.ts",
        "utf8",
      );

    for (const header of [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Robots-Tag",
    ]) {
      assert.match(
        source,
        new RegExp(
          header,
        ),
      );
    }
  },
);

test(
  "agenda possui validação de alinhamento no banco",
  () => {
    const source =
      fs.readFileSync(
        root +
          "/supabase/migrations/025_security_hardening.sql",
        "utf8",
      );

    assert.match(
      source,
      /INVALID_SLOT_ALIGNMENT/,
    );

    assert.match(
      source,
      /before insert or update/i,
    );

    assert.match(
      source,
      /slot_interval_minutes/,
    );
  },
);

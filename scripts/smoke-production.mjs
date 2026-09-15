const rawSiteUrl =
  process.env.SITE_URL ??
  process.argv[2];

const tenantSlug =
  process.env.TENANT_SLUG ??
  process.argv[3] ??
  "sevilha";

if (!rawSiteUrl) {
  console.error(`
Uso:

$env:SITE_URL="https://seu-dominio.vercel.app"
$env:TENANT_SLUG="sevilha"
npm run smoke:prod

ou:

node scripts/smoke-production.mjs https://seu-dominio.vercel.app sevilha
`);

  process.exit(1);
}

const baseUrl =
  rawSiteUrl.replace(
    /\/+$/,
    "",
  );

const failures = [];

function check(
  condition,
  message,
) {
  if (!condition) {
    failures.push(
      message,
    );

    console.error(
      `FAIL ${message}`,
    );

    return;
  }

  console.log(
    `PASS ${message}`,
  );
}

async function request(
  path,
) {
  const response =
    await fetch(
      `${baseUrl}${path}`,
      {
        redirect:
          "follow",
        headers: {
          "user-agent":
            "barbearia-release-smoke/1.0",
        },
      },
    );

  check(
    response.status <
      500,
    `${path} responde sem erro 5xx (${response.status})`,
  );

  check(
    response.headers.get(
      "x-content-type-options",
    ) === "nosniff",
    `${path} envia X-Content-Type-Options`,
  );

  check(
    response.headers.get(
      "x-frame-options",
    ) === "DENY",
    `${path} bloqueia framing`,
  );

  check(
    Boolean(
      response.headers.get(
        "referrer-policy",
      ),
    ),
    `${path} envia Referrer-Policy`,
  );

  return response;
}

console.log(
  `Smoke test: ${baseUrl}`,
);

await request("/");
await request(
  `/${tenantSlug}`,
);
await request(
  `/${tenantSlug}/reservar`,
);
await request(
  `/${tenantSlug}/login`,
);

const adminLogin =
  await request(
    "/admin/login",
  );

const robots =
  adminLogin.headers.get(
    "x-robots-tag",
  ) ?? "";

const cache =
  adminLogin.headers.get(
    "cache-control",
  ) ?? "";

check(
  robots.includes(
    "noindex",
  ),
  "/admin/login não é indexável",
);

check(
  cache.includes(
    "no-store",
  ),
  "/admin/login não usa cache compartilhado",
);

if (failures.length) {
  console.error(
    `\nSmoke test falhou em ${failures.length} verificação(ões).`,
  );

  process.exit(1);
}

console.log(
  "\nSmoke test aprovado.",
);

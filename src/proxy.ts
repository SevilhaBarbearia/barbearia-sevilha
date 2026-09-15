import {
  createServerClient,
} from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

function isProtectedAdminPath(
  pathname: string,
) {
  return (
    pathname === "/admin" ||
    (pathname.startsWith(
      "/admin/",
    ) &&
      !pathname.startsWith(
        "/admin/login",
      ))
  );
}

function isProtectedCustomerPath(
  pathname: string,
) {
  const segments =
    pathname
      .split("/")
      .filter(Boolean);

  return (
    segments.length >= 2 &&
    segments[1] ===
      "cliente"
  );
}

function buildAdminLoginUrl(
  request: NextRequest,
  reason?: string,
) {
  const url =
    request.nextUrl.clone();

  const requestedPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.pathname =
    "/admin/login";
  url.search = "";
  url.searchParams.set(
    "next",
    requestedPath,
  );

  if (reason) {
    url.searchParams.set(
      "erro",
      reason,
    );
  }

  return url;
}

function buildCustomerLoginUrl(
  request: NextRequest,
) {
  const segments =
    request.nextUrl.pathname
      .split("/")
      .filter(Boolean);

  const slug =
    segments[0] ?? "";

  const url =
    request.nextUrl.clone();

  const requestedPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.pathname =
    `/${encodeURIComponent(
      slug,
    )}/login`;
  url.search = "";
  url.searchParams.set(
    "motivo",
    "sessao-expirada",
  );
  url.searchParams.set(
    "next",
    requestedPath,
  );

  return url;
}

function clearSupabaseCookies(
  request: NextRequest,
  target: NextResponse,
) {
  for (
    const cookie
    of request.cookies.getAll()
  ) {
    if (
      !cookie.name.startsWith(
        "sb-",
      )
    ) {
      continue;
    }

    target.cookies.set({
      name: cookie.name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  return target;
}

export async function proxy(
  request: NextRequest,
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet,
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) =>
                request.cookies.set(
                  name,
                  value,
                ),
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) =>
                response.cookies.set(
                  name,
                  value,
                  options,
                ),
            );
          },
        },
      },
    );

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  /*
   * /api/auth/activity possui sua própria validação porque é justamente
   * o endpoint que registra atividade humana. Nas demais rotas, o proxy
   * recusa uma sessão que passou dos 30 minutos antes de liberar a request.
   */
  if (
    user &&
    pathname !==
      "/api/auth/activity"
  ) {
    const {
      data: active,
      error:
        activityError,
    } = await supabase.rpc(
      "check_current_app_session",
    );

    if (
      activityError ||
      active !== true
    ) {
      try {
        await supabase.auth.signOut({
          scope: "local",
        });
      } catch {
        /*
         * Mesmo se o Auth remoto falhar, a request protegida não recebe
         * autorização da aplicação quando a atividade não é válida.
         */
      }

      if (
        isProtectedAdminPath(
          pathname,
        )
      ) {
        return clearSupabaseCookies(
          request,
          NextResponse.redirect(
            buildAdminLoginUrl(
              request,
              "sessao-expirada",
            ),
          ),
        );
      }

      if (
        isProtectedCustomerPath(
          pathname,
        )
      ) {
        return clearSupabaseCookies(
          request,
          NextResponse.redirect(
            buildCustomerLoginUrl(
              request,
            ),
          ),
        );
      }

      /*
       * Página pública continua acessível, porém já sem uma sessão aceita
       * pela aplicação. O setAll acima propaga a remoção dos cookies.
       */
      return response;
    }
  }

  if (
    isProtectedAdminPath(
      pathname,
    )
  ) {
    if (!user) {
      return NextResponse.redirect(
        buildAdminLoginUrl(
          request,
        ),
      );
    }

    /*
     * Primeira barreira do admin: token válido + perfil ADMIN ativo.
     * A segunda barreira (membership do tenant) fica no layout
     * /admin/[slug] e nas políticas/RPCs do banco.
     */
    const { data: profile } =
      await supabase
        .from("profiles")
        .select(
          "role,is_active",
        )
        .eq("id", user.id)
        .maybeSingle<{
          role: string;
          is_active: boolean;
        }>();

    if (
      !profile ||
      profile.role !==
        "admin" ||
      !profile.is_active
    ) {
      await supabase.auth.signOut({
        scope: "local",
      });

      return clearSupabaseCookies(
        request,
        NextResponse.redirect(
          buildAdminLoginUrl(
            request,
            "sem-acesso",
          ),
        ),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

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

function buildAdminLoginUrl(
  request: NextRequest,
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

  return url;
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

  if (
    isProtectedAdminPath(
      request.nextUrl.pathname,
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

      const loginUrl =
        buildAdminLoginUrl(
          request,
        );

      loginUrl.searchParams.set(
        "erro",
        "sem-acesso",
      );

      return NextResponse.redirect(
        loginUrl,
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

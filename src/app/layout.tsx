import {
  Suspense,
} from "react";

import type {
  Metadata,
} from "next";

import {
  Manrope,
} from "next/font/google";

import "./globals.css";

import {
  AppRouteLoader,
} from "@/components/ui/AppRouteLoader";

import {
  AuthProvider,
} from "@/lib/auth/auth-provider";

/*
 * Eu mantenho a fonte global centralizada no RootLayout
 * para evitar carregamentos duplicados em cada tenant.
 */
const manrope = Manrope({
  subsets: [
    "latin",
  ],

  display: "swap",

  variable:
    "--font-manrope",
});

export const metadata: Metadata = {
  title:
    "Agendamento online",

  description:
    "Plataforma de agendamentos para barbearias.",
};

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={
        manrope.variable
      }
    >
      <body>
        {/*
         * AppRouteLoader utiliza useSearchParams().
         *
         * No Next.js 16 esse hook precisa estar abaixo de uma
         * Suspense Boundary quando o layout participa do prerender.
         *
         * O fallback pode ser null porque o loader só precisa existir
         * depois que o JavaScript do cliente estiver disponível.
         *
         * Isso não remove o loading com a tesoura.
         */}
        <Suspense
          fallback={null}
        >
          <AppRouteLoader />
        </Suspense>

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
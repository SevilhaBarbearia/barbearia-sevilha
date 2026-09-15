import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

import { NavigationLoadingBar } from "@/components/ui/NavigationLoadingBar";
import { AuthProvider } from "@/lib/auth/auth-provider";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Agendamento online",
  description:
    "Plataforma de agendamentos para barbearias.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={manrope.variable}
    >
      <body>
        <NavigationLoadingBar />

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { PrimeiroAcessoClient } from "./PrimeiroAcessoClient";

export const metadata: Metadata = {
  title: "Definir senha | Agendamento online",
  robots: { index: false, follow: false },
};

export default function PrimeiroAcessoPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0F0F11] px-4 py-10">
      <PrimeiroAcessoClient />
    </main>
  );
}

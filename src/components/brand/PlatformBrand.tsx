import Link from "next/link";
import { Scissors } from "lucide-react";

export function PlatformBrand({
  href = "/",
}: {
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3"
      aria-label="Ir para a página inicial"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#B8873F]/30 bg-[#B8873F]/10 text-[#B8873F]">
        <Scissors className="h-5 w-5" />
      </span>

      <span className="leading-tight">
        <span className="block text-sm font-extrabold text-current">
          Gestão de barbearias
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
          Agendamento online
        </span>
      </span>
    </Link>
  );
}

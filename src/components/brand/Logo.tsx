import Image from "next/image";
import Link from "next/link";
import { Scissors } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  compact?: boolean;
  className?: string;
  name: string;
  logoUrl?: string | null;
};

export function Logo({
  href = "/",
  compact = false,
  className,
  name,
  logoUrl,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-w-0 items-center gap-3.5 sm:gap-4",
        className,
      )}
      aria-label={`Ir para a página inicial da ${name}`}
    >
      <span className="ui-logo-mark relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-brand-500/40 bg-brand-950 shadow-button transition group-hover:-translate-y-0.5 group-hover:border-brand-100/70 sm:h-12 sm:w-12 sm:rounded-2xl">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`Logo da ${name}`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            priority
          />
        ) : (
          <Scissors
            aria-hidden="true"
            className="h-5 w-5 text-brand-100 sm:h-6 sm:w-6"
          />
        )}
      </span>

      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="ui-logo-name block truncate text-sm font-black tracking-tight text-white sm:text-base">
            {name}
          </span>
          <span className="ui-logo-subtitle block whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.20em] text-brand-100/75 sm:text-[11px] sm:tracking-[0.24em]">
            Agenda
          </span>
        </span>
      )}
    </Link>
  );
}

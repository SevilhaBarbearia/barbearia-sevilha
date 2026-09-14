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
  publicSurface?: boolean;
};

export function Logo({
  href = "/",
  compact = false,
  className,
  name,
  logoUrl,
  publicSurface = false,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-w-0 items-center gap-3 sm:gap-3.5",
        publicSurface && "ui-logo-public",
        className,
      )}
      aria-label={`Ir para a página inicial da ${name}`}
    >
      <span className="ui-logo-mark relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-brand-500/45 bg-brand-950 shadow-button transition duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-100/80 sm:h-14 sm:w-14">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`Logo da ${name}`}
            fill
            sizes="56px"
            className="ui-logo-image object-contain p-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]"
            priority
          />
        ) : (
          <span className="ui-logo-placeholder grid h-full w-full place-items-center">
            <Scissors
              aria-hidden="true"
              className="h-5 w-5 sm:h-6 sm:w-6"
            />
          </span>
        )}
      </span>

      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="ui-logo-name block max-w-[13rem] truncate text-base font-extrabold tracking-[-0.02em] text-white sm:max-w-[16rem] sm:text-lg">
            {name}
          </span>

          <span className="ui-logo-subtitle mt-1 block whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.22em] text-brand-100/80 sm:text-[11px]">
            Agenda online
          </span>
        </span>
      )}
    </Link>
  );
}

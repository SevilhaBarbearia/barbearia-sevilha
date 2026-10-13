import Link from "next/link";
import type { ComponentType } from "react";

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  tone = "amber",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  tone?: "amber" | "emerald" | "cyan" | "red";
}) {
  const toneClass = {
    amber: "text-amber-300 border-amber-300/20 bg-amber-300/[0.08]",
    emerald: "text-emerald-300 border-emerald-300/20 bg-emerald-300/[0.08]",
    cyan: "text-cyan-300 border-cyan-300/20 bg-cyan-300/[0.08]",
    red: "text-red-300 border-red-300/20 bg-red-300/[0.08]",
  }[tone];

  const inner = (
    <div className="group rounded-[1.4rem] border border-white/10 bg-[#1B2939] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.16)] transition hover:-translate-y-1 hover:border-amber-300/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <strong className="mt-3 block text-3xl font-black text-white">
            {value}
          </strong>
          {detail && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {detail}
            </p>
          )}
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${toneClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

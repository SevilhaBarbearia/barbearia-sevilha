import Link from "next/link";
import { Shield } from "lucide-react";
import { sairPlatformAdmin } from "@/lib/auth/platform-actions";

export function PlatformShell({
  children,
  current = "tenants",
}: {
  children: React.ReactNode;
  current?: "tenants" | "auditoria";
}) {
  return (
    <main className="min-h-screen bg-[#0D1621] text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto border-b border-white/10 bg-[#111B27] p-4 shadow-[8px_0_40px_rgba(0,0,0,0.18)] md:border-b-0 md:border-r lg:w-72 lg:p-5">
          <div className="mb-6 flex items-center justify-between gap-3 md:block">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <Link href="/plataforma" className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-300">
                  <Shield className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-white">
                    Plataforma
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Console central
                  </span>
                </span>
              </Link>
            </div>
          </div>

          <div className="mb-3 hidden px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 md:block">
            Gestão da plataforma
          </div>

          <nav className="grid gap-1">
            <Link
              href="/plataforma"
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
                (current === "tenants"
                  ? "bg-amber-300/10 text-amber-200"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
              }
            >
              Barbearias
            </Link>
          </nav>

          <form action={sairPlatformAdmin} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              Sair da plataforma
            </button>
          </form>
        </aside>

        <section className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.045),transparent_26%),radial-gradient(circle_at_top_left,rgba(253,230,138,0.045),transparent_24%),#0D1621] p-4 sm:p-5 md:p-7 lg:p-8">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

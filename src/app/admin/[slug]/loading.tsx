export default function AdminTenantLoading() {
  return (
    <div
      className="grid gap-5"
      aria-label="Carregando administração"
      role="status"
    >
      <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.07]" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]"
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="h-80 animate-pulse rounded-[1.5rem] border border-white/[0.06] bg-white/[0.04] xl:col-span-8" />
        <div className="h-80 animate-pulse rounded-[1.5rem] border border-white/[0.06] bg-white/[0.04] xl:col-span-4" />
      </div>

      <span className="sr-only">
        Carregando dados...
      </span>
    </div>
  );
}

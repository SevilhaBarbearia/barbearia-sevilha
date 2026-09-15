export default function TenantLoading() {
  return (
    <main
      className="min-h-screen bg-[#F7F3EC]"
      role="status"
      aria-label="Carregando página"
    >
      <div className="border-b border-black/[0.07] bg-white/80 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-black/[0.08] motion-reduce:animate-none" />

            <div>
              <div className="h-3.5 w-32 animate-pulse rounded-full bg-black/[0.09] motion-reduce:animate-none" />
              <div className="mt-2 h-2.5 w-20 animate-pulse rounded-full bg-black/[0.06] motion-reduce:animate-none" />
            </div>
          </div>

          <div className="h-10 w-28 animate-pulse rounded-xl bg-[#D6A63C]/30 motion-reduce:animate-none" />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <div className="h-5 w-40 animate-pulse rounded-full bg-[#D6A63C]/20 motion-reduce:animate-none" />

          <div className="mt-6 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-black/[0.09] motion-reduce:animate-none" />
          <div className="mt-3 h-12 w-4/5 max-w-lg animate-pulse rounded-2xl bg-black/[0.09] motion-reduce:animate-none" />

          <div className="mt-6 h-4 w-full max-w-lg animate-pulse rounded-full bg-black/[0.06] motion-reduce:animate-none" />
          <div className="mt-3 h-4 w-3/4 max-w-md animate-pulse rounded-full bg-black/[0.06] motion-reduce:animate-none" />

          <div className="mt-8 flex gap-3">
            <div className="h-11 w-36 animate-pulse rounded-xl bg-[#D6A63C]/30 motion-reduce:animate-none" />
            <div className="h-11 w-32 animate-pulse rounded-xl bg-black/[0.07] motion-reduce:animate-none" />
          </div>
        </div>

        <div className="aspect-[4/3] animate-pulse rounded-[2rem] border border-black/[0.06] bg-black/[0.06] motion-reduce:animate-none" />
      </div>

      <span className="sr-only">
        Carregando conteúdo...
      </span>
    </main>
  );
}

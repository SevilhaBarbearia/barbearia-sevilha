"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-zinc-950 p-10 text-white">
      <h1 className="text-2xl font-bold">
        Não foi possível concluir a operação
      </h1>
      <p className="my-4">Tente novamente em instantes.</p>
      <button onClick={reset} className="rounded bg-white px-4 py-2 text-black">
        Tentar novamente
      </button>
    </main>
  );
}

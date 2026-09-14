"use client";

import { useState } from "react";
import { uploadImage } from "@/features/storage/actions";
import { Input } from "@/components/ui/Input";

export function ImageField({
  name,
  defaultValue = "",
  slug,
  category,
}: {
  name: string;
  defaultValue?: string;
  slug: string;
  category: "branding" | "services" | "barbers";
}) {
  const [url, setUrl] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-2">
      <Input
        name={name}
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://..."
      />
      <input
        aria-label="Enviar imagem"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMessage("Enviando imagem...");
          try {
            const data = new FormData();
            data.set("slug", slug);
            data.set("category", category);
            data.set("file", file);
            const result = await uploadImage(data);
            if (result.ok && result.url) setUrl(result.url);
            setMessage(result.mensagem);
          } catch {
            setMessage("Não foi possível enviar. Tente novamente.");
          } finally {
            setBusy(false);
          }
        }}
        className="max-w-full text-sm text-zinc-300"
      />
      {message && (
        <p role="status" className="text-sm text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}

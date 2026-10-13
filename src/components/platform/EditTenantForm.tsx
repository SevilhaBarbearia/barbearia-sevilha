"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

import {
  updateTenant,
  type ActionResult,
} from "@/features/platform/tenant-actions";
import { createClient } from "@/lib/supabase/client";

const initial: ActionResult = { ok: false, mensagem: "" };

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao ler imagem."));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
}

async function processLogo(file: File): Promise<Blob> {
  const MAX = 512;
  const img = await fileToImage(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const scale = Math.min(MAX / w0, MAX / h0, 1);
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter."))),
      "image/webp",
      0.9,
    );
  });
}

export function EditTenantForm({
  slug,
  barbershopId,
  initialName,
  initialSlug,
  initialEmail,
  initialLogoUrl,
}: {
  slug: string;
  barbershopId: string;
  initialName: string;
  initialSlug: string;
  initialEmail: string;
  initialLogoUrl: string;
}) {
  const [state, action, pending] = useActionState(updateTenant, initial);

  const [name, setName] = useState(initialName);
  const [newSlug, setNewSlug] = useState(initialSlug);
  const [email, setEmail] = useState(initialEmail);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-300/20";
  const labelClass =
    "mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400";

  async function handleLogo(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const blob = await processLogo(file);
      const supabase = createClient();
      const path = `${barbershopId}/branding/logo-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("barbershop-public")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage
        .from("barbershop-public")
        .getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e) {
      setUploadError(
        e instanceof Error
          ? `Não foi possível processar a imagem: ${e.message}`
          : "Não foi possível processar a imagem.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = pending || uploading;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="barbershop_id" value={barbershopId} />
      <input type="hidden" name="logo_url" value={logoUrl} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="et-name" className={labelClass}>Nome</label>
          <input
            id="et-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="et-slug" className={labelClass}>Slug</label>
          <input
            id="et-slug"
            name="new_slug"
            value={newSlug}
            onChange={(e) =>
              setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            required
            maxLength={60}
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
            Mudar o slug altera o endereço público. Links antigos deixam de
            funcionar.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="et-email" className={labelClass}>
          E-mail de contato
        </label>
        <input
          id="et-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          placeholder="contato@barbearia.com"
          className={inputClass}
        />
      </div>

      <div>
        <span className={labelClass}>Logo</span>

        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo atual"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                Sem logo
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <label
              className={
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.06] " +
                (busy ? "pointer-events-none opacity-60" : "")
              }
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Processando..." : "Enviar logo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleLogo(f);
                }}
              />
            </label>

            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              PNG, JPG ou WebP. A imagem é ajustada automaticamente (mantendo
              a proporção, sem esticar nem cortar) e otimizada em até 512px.
            </p>

            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl("")}
                className="mt-2 text-[11px] font-bold text-red-300 hover:text-red-200"
              >
                Remover logo
              </button>
            )}
          </div>
        </div>

        {uploadError && (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
          >
            {uploadError}
          </p>
        )}
      </div>

      {state && state.mensagem && (
        <p
          role="alert"
          className={
            state.ok
              ? "rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100"
              : "rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100"
          }
        >
          {state.mensagem}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="h-11 rounded-xl bg-amber-300 px-5 text-sm font-extrabold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

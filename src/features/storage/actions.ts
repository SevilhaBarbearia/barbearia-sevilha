"use server";

import { randomUUID } from "node:crypto";
import { requireBarbershopManager } from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";

export async function uploadImage(data: FormData) {
  const { barbershop } = await requireBarbershopManager(
    String(data.get("slug") ?? ""),
  );
  const category = String(data.get("category"));
  const file = data.get("file");
  if (
    !["branding", "services", "barbers"].includes(category) ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  ) {
    return {
      ok: false,
      mensagem: "Escolha uma imagem JPG, PNG ou WebP de até 5 MB.",
    };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  // Eu confiro a assinatura para não confiar apenas na extensão informada pelo navegador.
  const extension = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "jpg"
      : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "webp"
        : null;
  if (!extension) return { ok: false, mensagem: "Formato de imagem inválido." };
  const client = await createClient();
  const path = `${barbershop.id}/${category}/${randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from("barbershop-public")
    .upload(path, bytes, {
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
      upsert: false,
    });
  if (error)
    return { ok: false, mensagem: "Não foi possível enviar a imagem." };
  const { data: result } = client.storage
    .from("barbershop-public")
    .getPublicUrl(path);
  return {
    ok: true,
    mensagem: "Imagem enviada. Salve o formulário para aplicar.",
    url: result.publicUrl,
  };
}

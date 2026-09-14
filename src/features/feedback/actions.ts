"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export type FeedbackState = { ok: boolean; message: string };

export async function submitFeedback(
  _state: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = feedbackSchema.safeParse({
    token: formData.get("token"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success)
    return { ok: false, message: "Escolha uma nota de 1 a 5." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_appointment_feedback", {
    token: parsed.data.token,
    score: parsed.data.rating,
    feedback_comment: parsed.data.comment || null,
  });

  if (error || !data)
    return {
      ok: false,
      message: "Este link é inválido, expirou ou já foi utilizado.",
    };
  return { ok: true, message: "Obrigado! Sua avaliação foi registrada." };
}

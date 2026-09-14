"use client";

import { useActionState } from "react";
import { submitFeedback } from "@/features/feedback/actions";
import { Button } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/Input";

export function FeedbackForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitFeedback, {
    ok: false,
    message: "",
  });

  if (state.ok)
    return (
      <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
        {state.message}
      </p>
    );

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-white">Sua nota</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label
              key={rating}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xl text-brand-100 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/20"
            >
              <input
                className="sr-only"
                type="radio"
                name="rating"
                value={rating}
                required
              />
              {rating} ★
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="comment">Comentário opcional</Label>
        <Textarea
          id="comment"
          name="comment"
          maxLength={1000}
          rows={5}
          placeholder="Conte como foi seu atendimento."
        />
      </div>
      {state.message && <p className="text-sm text-red-300">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}

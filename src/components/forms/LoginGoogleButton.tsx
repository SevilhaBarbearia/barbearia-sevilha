"use client";

import {
  useState,
} from "react";

import {
  LogIn,
  Scissors,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

function obterOrigemAtual() {
  if (
    typeof window !==
    "undefined"
  ) {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(
      /\/$/,
      "",
    ) ??
    "http://localhost:3000"
  );
}

function safeInternalPath(
  value: string | undefined,
  fallback: string,
) {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\x00-\x1f]/.test(value)
  ) {
    return value;
  }

  return fallback;
}

export function LoginGoogleButton({
  slug,
  next,
}: {
  slug: string;
  next?: string;
}) {
  const [loading, setLoading] =
    useState(false);

  async function entrarComGoogle() {
    if (loading) return;

    setLoading(true);

    const supabase =
      createClient();

    const siteUrl =
      obterOrigemAtual();

    const safeNext =
      safeInternalPath(
        next,
        `/${slug}/reservar`,
      );

    const callback =
      new URL(
        "/auth/callback",
        siteUrl,
      );

    callback.searchParams.set(
      "next",
      safeNext,
    );

    const { error } =
      await supabase.auth.signInWithOAuth(
        {
          provider: "google",

          options: {
            redirectTo:
              callback.toString(),
          },
        },
      );

    if (error) {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={
        entrarComGoogle
      }
      disabled={loading}
      aria-busy={loading}
      className="w-full"
    >
      {loading ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-sm">
          <Scissors
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
        </span>
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white font-black text-zinc-950 shadow-sm">
          G
        </span>
      )}

      <span>
        {loading
          ? "Abrindo Google..."
          : "Continuar com Google"}
      </span>

      {!loading && (
        <LogIn className="h-4 w-4 opacity-60" />
      )}
    </Button>
  );
}

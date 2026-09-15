"use client";

import {
  usePathname,
} from "next/navigation";

import { RouteErrorState } from "@/components/ui/RouteErrorState";

export default function AdminTenantError({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  const pathname =
    usePathname();

  const parts =
    pathname
      .split("/")
      .filter(Boolean);

  const slug =
    parts[0] === "admin"
      ? parts[1]
      : null;

  return (
    <RouteErrorState
      error={error}
      reset={reset}
      homeHref={
        slug
          ? `/admin/${slug}`
          : "/admin"
      }
      admin
    />
  );
}

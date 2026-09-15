"use client";

import {
  usePathname,
} from "next/navigation";

import { RouteErrorState } from "@/components/ui/RouteErrorState";

export default function TenantError({
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

  const slug =
    pathname
      .split("/")
      .filter(Boolean)[0];

  return (
    <RouteErrorState
      error={error}
      reset={reset}
      homeHref={
        slug
          ? `/${slug}`
          : "/"
      }
    />
  );
}

import type { CSSProperties, ReactNode } from "react";
import { requireBarbershop } from "@/features/tenancy/server";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await requireBarbershop(slug);
  const primary = /^#[0-9a-f]{6}$/i.test(shop.primary_color)
    ? shop.primary_color
    : "#c8902f";
  const secondary = /^#[0-9a-f]{6}$/i.test(shop.secondary_color)
    ? shop.secondary_color
    : "#ffe7bf";
  const style = {
    "--color-brand-500": primary,
    "--color-brand-600": `color-mix(in srgb, ${primary}, black 15%)`,
    "--color-brand-100": secondary,
    "--color-brand-200": secondary,
  } as CSSProperties;
  return <div style={style}>{children}</div>;
}

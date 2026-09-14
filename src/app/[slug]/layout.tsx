import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";

import {
  getBarbershopBySlug,
  requireBarbershop,
} from "@/features/tenancy/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ACCENT,
  DEFAULT_TENANT_FOREGROUND,
  hexValido,
} from "@/lib/theme/paleta-marca";
import { getTenantUiVersion } from "@/lib/ui-rollout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getBarbershopBySlug(slug);

  if (!shop) {
    return {
      title: "Agendamento online",
      robots: { index: false, follow: false },
    };
  }

  const description =
    shop.description?.trim() || `Agende seu horário na ${shop.name}.`;

  const socialImage = shop.cover_url || shop.logo_url || undefined;

  return {
    title: shop.name,
    description,
    icons: shop.logo_url
      ? {
          icon: shop.logo_url,
          shortcut: shop.logo_url,
          apple: shop.logo_url,
        }
      : undefined,
    openGraph: {
      type: "website",
      title: shop.name,
      description,
      images: socialImage
        ? [
            {
              url: socialImage,
              alt: shop.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: shop.name,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await requireBarbershop(slug);
  const uiVersion = await getTenantUiVersion(shop.slug);

  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("business_settings")
    .select("secondary_color")
    .eq("barbershop_id", shop.id)
    .maybeSingle();

  const primary = hexValido(shop.primary_color)
    ? shop.primary_color
    : DEFAULT_TENANT_ACCENT;

  // Eu uso o foreground já persistido quando a identidade foi configurada.
  const foreground = hexValido(settings?.secondary_color)
    ? settings.secondary_color
    : hexValido(shop.secondary_color)
      ? shop.secondary_color
      : DEFAULT_TENANT_FOREGROUND;

  const legacyStyle = {
    "--color-brand-500": primary,
    "--color-brand-600": `color-mix(in srgb, ${primary}, black 15%)`,
    "--color-brand-100": shop.secondary_color,
    "--color-brand-200": shop.secondary_color,
  } as CSSProperties;

  const warmPremiumStyle = {
    "--tenant-accent": primary,
    "--tenant-accent-foreground": foreground,
    "--tenant-accent-hover": `color-mix(in srgb, ${primary}, black 12%)`,
    "--tenant-accent-soft": `color-mix(in srgb, ${primary} 13%, transparent)`,
    "--color-brand-500": primary,
    "--color-brand-600": `color-mix(in srgb, ${primary}, black 12%)`,
    "--color-brand-100": `color-mix(in srgb, ${primary}, white 72%)`,
    "--color-brand-200": `color-mix(in srgb, ${primary}, white 52%)`,
  } as CSSProperties;

  return (
    <div
      style={uiVersion === "warm-premium" ? warmPremiumStyle : legacyStyle}
      data-ui-version={uiVersion}
      data-tenant={shop.slug}
    >
      {children}
    </div>
  );
}

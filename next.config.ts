import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async redirects() {
    return [
      ...[
        "agenda",
        "barbeiros",
        "configuracoes",
        "faturamento",
        "horarios",
        "pagamentos",
        "reservas",
        "servicos",
      ].map((page) => ({
        source: `/admin/${page}`,
        destination: `/admin/sevilha/${page}`,
        permanent: false,
      })),
      {
        source: "/cliente/:path*",
        destination: "/sevilha/cliente/:path*",
        permanent: false,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
] as const;

const privatePageHeaders = [
  {
    key: "Cache-Control",
    value:
      "private, no-store, max-age=0, must-revalidate",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname:
          "lh3.googleusercontent.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
        ],
      },
      {
        source:
          "/admin/:path*",
        headers: [
          ...privatePageHeaders,
        ],
      },
      {
        source:
          "/:slug/cliente/:path*",
        headers: [
          ...privatePageHeaders,
        ],
      },
      {
        source:
          "/auth/:path*",
        headers: [
          ...privatePageHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;

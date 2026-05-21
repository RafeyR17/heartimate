import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { getSecurityHeaders } from "./lib/security-headers";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 
          'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 
          'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 
          'https://us.i.posthog.com/decide',
      },
    ]
  },
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  turbopack: {
    resolveAlias: {
      fs: { browser: './lib/empty-module.ts' },
      path: { browser: 'path-browserify' },
    },
  },
};

export default withBundleAnalyzer(nextConfig);

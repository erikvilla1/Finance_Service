import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Pins the workspace root explicitly. Without this, Turbopack's automatic
  // detection gets confused by an unrelated package-lock.json sitting in
  // ~/ (outside this repo) and picks the wrong root, which manifests as the
  // dev server hanging indefinitely on the first request.
  turbopack: {
    root: __dirname,
  },

  // Security headers. Platform spec §28 requires HTTPS everywhere and
  // hardened defaults. Review with a security professional before launch.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

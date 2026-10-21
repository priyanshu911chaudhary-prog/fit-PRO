import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output:"standalone",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      // Legacy /api/v1 specific endpoint mappings
      { source: "/api/v1/profile/setup-profile", destination: "/api/profile" },
      { source: "/api/v1/bmi/log", destination: "/api/bmi" },
      { source: "/api/v1/bmi/history", destination: "/api/bmi" },
      { source: "/api/v1/workout/log", destination: "/api/workout" },
      { source: "/api/v1/workout/history", destination: "/api/workout" },
      { source: "/api/v1/meal/log", destination: "/api/meal" },
      { source: "/api/v1/meal/history", destination: "/api/meal" },
      { source: "/api/v1/water/log", destination: "/api/water" },
      { source: "/api/v1/water/today", destination: "/api/water/today" },

      // Legacy unversioned subpath aliases
      { source: "/api/profile/setup-profile", destination: "/api/profile" },
      { source: "/api/bmi/log", destination: "/api/bmi" },
      { source: "/api/bmi/history", destination: "/api/bmi" },
      { source: "/api/workout/log", destination: "/api/workout" },
      { source: "/api/workout/history", destination: "/api/workout" },
      { source: "/api/meal/log", destination: "/api/meal" },
      { source: "/api/meal/history", destination: "/api/meal" },
      { source: "/api/water/log", destination: "/api/water" },

      // General fallback for all other /api/v1/* routes (e.g. /api/v1/auth/login -> /api/auth/login)
      { source: "/api/v1/:path*", destination: "/api/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://accounts.google.com https://generativelanguage.googleapis.com",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

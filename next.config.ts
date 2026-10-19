import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;

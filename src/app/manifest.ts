import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit-PRO Fitness & Wellness",
    short_name: "Fit-PRO",
    description: "Personalized AI-powered fitness, hydration, and nutrition tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#10b981",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/fit-pro-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}

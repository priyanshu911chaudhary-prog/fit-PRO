import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: "fit-PRO | Training journal", template: "%s | fit-PRO" },
  description: "Track workouts, meals, water, and measurements in your personal training journal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-400">
        <Providers>
          <Suspense fallback={<header className="h-16 w-full border-b border-border/40 bg-background/80" />}>
            <Navbar />
          </Suspense>
          <main id="main-content" className="flex min-w-0 flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

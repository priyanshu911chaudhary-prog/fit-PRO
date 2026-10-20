import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AI Fitness | Intelligent Fitness Tracking & AI Coach",
    template: "%s | AI Fitness",
  },
  description:
    "Transform your fitness journey with precision AI workout and meal plans, real-time AI coaching powered by Google Gemini, BMI tracking, and automated hydration monitoring.",
  keywords: [
    "AI fitness",
    "workout generator",
    "meal planner",
    "AI fitness coach",
    "Gemini AI",
    "fitness tracking",
    "BMI calculator",
  ],
  authors: [{ name: "AI Fitness Team" }],
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
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-400">
        <Providers>
          <Suspense fallback={<header className="h-16 w-full border-b border-border/40 bg-background/80" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 flex flex-col">{children}</main>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}

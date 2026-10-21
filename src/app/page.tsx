import { Suspense } from "react";
import { HomePageContent } from "@/features/home/components/home-page-content";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background" />
      }
    >
      <HomePageContent />
    </Suspense>
  );
}

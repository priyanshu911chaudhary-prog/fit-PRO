import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Dumbbell, GlassWater, Utensils } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const journal = [
  { icon: Dumbbell, title: "Training", detail: "Record exercises, sets and reps, then revisit each session." },
  { icon: Utensils, title: "Nutrition", detail: "Build meals from the food catalog and see your daily macros." },
  { icon: GlassWater, title: "Hydration", detail: "Log a glass of water and follow your daily intake." },
];

export function HomePageContent() {
  return (
    <div className="home-frame">
      <section className="home-hero">
        <div className="hero-copy">
          <h1>Your training<br /><em>journal.</em></h1>
          <p>Workouts, meals, and water in one place. Keep a record of your day and see how your training adds up.</p>
          <Link href="/register" className={buttonVariants({ size: "lg" })}>Start your journal <ArrowUpRight /></Link>
        </div>
        <div className="hero-photo">
          <Image src="/training-run.jpg" alt="Runner training outdoors" fill sizes="(max-width: 720px) 100vw, 50vw" preload style={{ objectFit: "cover" }} />
        </div>
      </section>
      <section aria-label="What you can track" className="journal-features">
        {journal.map(({ icon: Icon, title, detail }) => (
          <article key={title}><Icon aria-hidden="true" size={22} /><div><h2>{title}</h2><p>{detail}</p></div></article>
        ))}
      </section>
    </div>
  );
}

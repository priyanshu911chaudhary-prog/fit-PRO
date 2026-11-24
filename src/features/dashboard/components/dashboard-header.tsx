import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function DashboardHeader({ greeting, userName, streak }: { greeting: string; userName?: string; streak: number }) {
  return (
    <PageHeading title={greeting + ", " + (userName || "athlete")} description={streak > 0 ? `Workout streak · ${streak} ${streak === 1 ? "day" : "days"}` : "Your daily activity and latest measurements."}>
      <Link href="/coach" className={buttonVariants({ variant: "outline" })}>Ask AI Coach</Link>
    </PageHeading>
  );
}

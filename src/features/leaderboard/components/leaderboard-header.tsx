import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";

interface LeaderboardHeaderProps {
  period: "current" | "previous";
  onPeriodChange: (p: "current" | "previous") => void;
  weekStart?: string;
  weekEnd?: string;
  isFinalized?: boolean;
  onOpenSettings: () => void;
}

export function LeaderboardHeader({
  period,
  onPeriodChange,
  weekStart,
  weekEnd,
  isFinalized,
  onOpenSettings,
}: LeaderboardHeaderProps) {
  return <PageHeading title="Weekly leaderboard" description={weekStart && weekEnd ? weekStart + " – " + weekEnd + " (IST)" + (isFinalized ? " · Final results" : "") : undefined}>
    <div className="flex flex-wrap gap-2">
      <Button variant={period === "current" ? "default" : "outline"} aria-pressed={period === "current"} onClick={() => onPeriodChange("current")}>This week</Button>
      <Button variant={period === "previous" ? "default" : "outline"} aria-pressed={period === "previous"} onClick={() => onPeriodChange("previous")}>Last week</Button>
      <Button variant="outline" onClick={onOpenSettings}>Settings &amp; goals</Button>
    </div>
  </PageHeading>;
}

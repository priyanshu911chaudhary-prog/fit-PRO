import { PageHeading } from "@/components/page-heading";
import type { BmiDelta } from "../types";

export function BmiHeader({ historyDelta }: { historyDelta: BmiDelta | null }) {
  return <PageHeading title="Measurements" description="Record a weigh-in and follow your weight and BMI over time.">
    {historyDelta && <span className="text-sm text-muted-foreground">Weight change · {historyDelta.weightDiff > 0 ? "+" : ""}{historyDelta.weightDiff} kg</span>}
  </PageHeading>;
}

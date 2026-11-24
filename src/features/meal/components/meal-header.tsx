import { PageHeading } from "@/components/page-heading";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MealHeader({ historyCount }: { historyCount: number }) {
  return (
    <PageHeading title="Meals" description="Build a plate and review your daily nutrition.">
      <TabsList aria-label="Meals views">
        <TabsTrigger value="log">Log meal</TabsTrigger>
        <TabsTrigger value="history">History ({historyCount})</TabsTrigger>
      </TabsList>
    </PageHeading>
  );
}

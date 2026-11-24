import { PageHeading } from "@/components/page-heading";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WorkoutHeader({ historyCount }: { historyCount: number }) {
  return (
    <PageHeading title="Workouts" description="Record your exercises and revisit past sessions.">
      <TabsList aria-label="Workouts views">
        <TabsTrigger value="log">Log session</TabsTrigger>
        <TabsTrigger value="history">History ({historyCount})</TabsTrigger>
      </TabsList>
    </PageHeading>
  );
}

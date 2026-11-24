import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { VESSELS } from "../lib/constants";
import type { HydrationStats } from "../lib/calculations";

interface WaterIntakeFormProps {
  stats: HydrationStats;
  isSubmitting: boolean;
  hasLogs: boolean;
  customAmount: number;
  onCustomAmountChange: (amount: number) => void;
  onAddWater: (amount: number) => void;
  onUndoLast: () => void;
}

export function WaterIntakeForm({
  stats,
  isSubmitting,
  hasLogs,
  customAmount,
  onCustomAmountChange,
  onAddWater,
  onUndoLast,
}: WaterIntakeFormProps) {
  const { total, target, percentage, remaining } = stats;
  return (
    <Card>
      <CardContent className="grid items-center gap-8 py-3 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Today’s water</h2>
          <div><span data-testid="water-total" className="text-5xl font-medium tracking-tight">{total}</span>
            <span className="ml-2 text-muted-foreground">/ {target} ml</span></div>
          <Progress value={percentage} aria-label="Daily hydration goal" />
          <p className="text-sm text-muted-foreground">{remaining ? remaining + " ml to your goal" : "Daily goal reached"}</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {VESSELS.map(({ amount }) => (
              <Button key={amount} variant="outline" disabled={isSubmitting} onClick={() => onAddWater(amount)}>+{amount} ml</Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-water">Custom amount (ml)</Label>
            <div className="flex flex-wrap gap-2">
              <Input id="custom-water" className="min-w-20 flex-1" type="number" min={1} max={5000}
                placeholder="Amount (ml)" value={customAmount || ""} onChange={(event) => onCustomAmountChange(Number(event.target.value))} />
              <Button id="water-add-btn" disabled={isSubmitting} onClick={() => onAddWater(customAmount)}>Add water</Button>
              <Button id="water-undo-btn" variant="ghost" disabled={isSubmitting || !hasLogs} onClick={onUndoLast}>Undo</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

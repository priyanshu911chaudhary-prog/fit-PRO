import React from "react";
import { Clock, Droplet, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WaterLog } from "../types";

interface WaterIntakeLogProps {
  logs: WaterLog[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function WaterIntakeLog({ logs, isLoading, onDelete }: WaterIntakeLogProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-cyan-400" />
            Today&apos;s Fluid Intake Stream
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Individual volumetric timestamps logged for today&apos;s recovery cycle
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
          {logs.length} Entries
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="size-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-muted-foreground">
              Syncing hydration log...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
              <Droplet className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No hydration logs recorded today</p>
              <p className="text-[11px] text-muted-foreground">
                Tap any vessel above or use the quick custom slider to record intake.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const amountVal = log.amountMl ?? log.amount ?? 0;
              const timeStr = log.date || log.createdAt
                ? new Date(log.date || log.createdAt!).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Today";

              return (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/40 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Droplet className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-foreground">
                          +{amountVal} ml
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({Math.round((amountVal / 250) * 10) / 10} cups)
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-cyan-400" />
                        Logged at {timeStr}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(log._id)}
                    className="size-8 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Delete water log"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

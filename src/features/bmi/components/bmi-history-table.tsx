import React from "react";
import { History, Loader2, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { BmiRecord } from "../types";

interface BmiHistoryTableProps {
  history: BmiRecord[];
  isLoading: boolean;
}

export function BmiHistoryTable({ history, isLoading }: BmiHistoryTableProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-emerald-400" />
            Anthropometric Measurement Archive
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Verified chronological records of weight, stature, and computed body composition
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
          {history.length} Entries Recorded
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="size-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-mono text-muted-foreground">
              Retrieving biometric archive...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
              <Scale className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No measurements recorded</p>
              <p className="text-[11px] text-muted-foreground">
                Use the measurement station above to log your current stature and mass.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Stature</th>
                  <th className="py-3 px-3">Mass</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {history.map((record, idx) => {
                  const rawDate = record.date || record.createdAt;
                  let displayDate = "Recent";
                  if (rawDate) {
                    const parsed = new Date(rawDate);
                    if (!isNaN(parsed.getTime())) {
                      displayDate = parsed.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                    } else {
                      displayDate = String(rawDate);
                    }
                  }

                  const badgeTone = {
                    underweight: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
                    normal: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                    overweight: "border-amber-500/30 text-amber-400 bg-amber-500/10",
                    obese: "border-rose-500/30 text-rose-400 bg-rose-500/10",
                  }[record.category?.toLowerCase()] || "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";

                  return (
                    <tr
                      key={record._id || record.id || idx}
                      className="hover:bg-muted/20 transition-colors font-mono"
                    >
                      <td className="py-3 px-3 text-muted-foreground font-medium">{displayDate}</td>
                      <td className="py-3 px-3 text-foreground">{record.height} cm</td>
                      <td className="py-3 px-3 font-bold text-foreground">{record.weight} kg</td>
                      <td className="py-3 px-3 font-extrabold text-emerald-400">{record.bmi}</td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={cn("text-[10px] capitalize px-2 py-0.5 font-semibold", badgeTone)}>
                          {record.category}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

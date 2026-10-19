"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  Plus,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { calculateBMI } from "@/lib/fitness-calc";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface BmiRecord {
  _id?: string;
  id?: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  date?: string;
  createdAt?: string | Date;
}

export default function BmiPage() {
  const [history, setHistory] = useState<BmiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);

  const fetchHistory = async () => {
    try {
      const res = await apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi");
      const records = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
        ? (res.data as { history: BmiRecord[] }).history
        : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
        ? (res.data as { records: BmiRecord[] }).records
        : [];

      if (res.success && records) {
        setHistory(records);
        if (records.length > 0) {
          const latest = records[0];
          if (latest.height) setHeight(latest.height);
          if (latest.weight) setWeight(latest.weight);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi")
      .then((res) => {
        const records = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
          ? (res.data as { history: BmiRecord[] }).history
          : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
          ? (res.data as { records: BmiRecord[] }).records
          : [];

        if (isMounted && res.success && records) {
          setHistory(records);
          if (records.length > 0) {
            const latest = records[0];
            if (latest.height) setHeight(latest.height);
            if (latest.weight) setWeight(latest.weight);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live calculation preview
  const liveBMI = calculateBMI(weight, height);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weight < 20 || weight > 300) {
      toast.error("Weight must be between 20 and 300 kg.");
      return;
    }
    if (height < 50 || height > 250) {
      toast.error("Height must be between 50 and 250 cm.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/bmi", {
        method: "POST",
        body: JSON.stringify({
          weight: Number(weight),
          height: Number(height),
        }),
      });

      if (res.success) {
        toast.success("BMI record logged successfully!");
        await fetchHistory();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to log BMI record";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = [...history]
    .reverse()
    .map((item) => {
      const rawDate = item.date || item.createdAt;
      let displayDate = "Entry";
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          displayDate = parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        } else {
          displayDate = String(rawDate);
        }
      }
      return {
        date: displayDate,
        bmi: item.bmi,
        weight: item.weight,
        height: item.height,
        category: item.category,
      };
    });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">BMI & Body Composition</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track body mass index trends and monitor long-term weight stability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Form */}
        <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="size-4 text-indigo-400" />
              Log Body Measurement
            </CardTitle>
            <CardDescription className="text-xs">
              Enter your current height and weight to calculate your BMI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min={50}
                  max={250}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={20}
                  max={300}
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="bg-background/50"
                  required
                />
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Live Computed BMI
                </span>
                <div className="text-3xl font-extrabold text-foreground">{liveBMI.bmi}</div>
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 capitalize">
                    {liveBMI.category}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus className="size-4 mr-1.5" />
                    Save Measurement
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* BMI Chart */}
        <Card className="lg:col-span-2 border-border/60 bg-card/75 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold">BMI Trajectory</CardTitle>
            <CardDescription className="text-xs">
              Visualizing changes across healthy (&lt;25), overweight (&lt;30), and custom baselines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bmi"
                      name="BMI"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#8b5cf6" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-xs text-muted-foreground">
                No history recorded yet. Submit your first measurement above.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-border/60 bg-card/75 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="size-4 text-indigo-400" />
              Measurement History
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological log of height, weight, and BMI categories.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 text-indigo-500 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No entries found. Log your first measurement above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Height</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">BMI</th>
                    <th className="py-2.5 px-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
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
                    return (
                      <tr key={record._id || record.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{displayDate}</td>
                        <td className="py-2.5 px-3">{record.height} cm</td>
                        <td className="py-2.5 px-3 font-semibold">{record.weight} kg</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-400">{record.bmi}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 capitalize">
                            {record.category}
                          </span>
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
    </div>
  );
}

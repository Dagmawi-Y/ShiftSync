"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
} from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FairnessChart,
  type FairnessEntry,
} from "@/components/admin/fairness-chart";
import {
  OvertimeChart,
  type OvertimeEntry,
} from "@/components/admin/overtime-chart";
import { BarChart3, ChevronLeft, ChevronRight, Scale } from "lucide-react";

export default function AdminAnalyticsPage() {
  const { selectedLocationId } = useDashboard();
  const [weekOffset, setWeekOffset] = useState(0);
  const [fairness, setFairness] = useState<FairnessEntry[]>([]);
  const [overtime, setOvertime] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });
  const weekEnd = endOfWeek(subWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      });
      if (selectedLocationId) {
        params.set("locationId", selectedLocationId);
      }

      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data ?? {};
      setFairness(data.fairnessReport ?? []);
      setOvertime(data.overtimeRisk ?? []);
    } catch {
      // Graceful degrade
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString(), selectedLocationId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fairness and overtime insights.
          </p>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Fairness chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="size-4" />
            Hours Distribution
          </CardTitle>
          <CardDescription>
            Scheduled hours per staff member vs their desired weekly hours.
            Premium shift allocation is flagged if uneven.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FairnessChart data={fairness} loading={loading} />
        </CardContent>
      </Card>

      {/* Overtime chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4" />
            Overtime Risk
          </CardTitle>
          <CardDescription>
            Staff approaching or exceeding 40 weekly hours. Only staff with
            35+ hours are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OvertimeChart data={overtime} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}

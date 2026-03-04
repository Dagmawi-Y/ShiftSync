"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "@/lib/dashboard-context";
import { startOfWeek, endOfWeek } from "date-fns";
import {
  CalendarDays,
  Users,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/admin/kpi-card";
import { OnDutyGrid } from "@/components/admin/on-duty-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

interface KpiData {
  activeShifts: number;
  staffOnDuty: number;
  pendingSwaps: number;
  overtimeRisk: number;
}

export default function AdminDashboardPage() {
  const { locations } = useDashboard();

  const { data: kpis, isLoading: loading } = useQuery<KpiData>({
    queryKey: ["admin-dashboard-kpis"],
    queryFn: async () => {
      // Fetch active shifts count
      const activeRes = await fetch("/api/shifts/active");
      const activeJson = await activeRes.json();
      const activeShifts = activeJson.data?.shifts?.length ?? 0;
      const staffOnDuty =
        activeJson.data?.shifts?.reduce(
          (sum: number, s: { assignments: unknown[] }) =>
            sum + s.assignments.length,
          0
        ) ?? 0;

      // Fetch pending swaps count
      const swapsRes = await fetch("/api/swaps?status=PENDING_MANAGER");
      const swapsJson = await swapsRes.json();
      const pendingArr = swapsJson.data ?? [];
      const pendingSwaps = Array.isArray(pendingArr) ? pendingArr.length : 0;

      // Fetch overtime risk
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const analyticsRes = await fetch(
        `/api/analytics?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
      );
      const analyticsJson = await analyticsRes.json();
      const overtime = analyticsJson.data?.overtimeRisk?.length ?? 0;

      return {
        activeShifts,
        staffOnDuty,
        pendingSwaps,
        overtimeRisk: overtime,
      };
    },
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Corporate overview across all locations.
        </p>
      </div>

      {/* KPI cards */}
      <SectionErrorBoundary section="KPIs" compact>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              title="Active Shifts"
              value={kpis?.activeShifts ?? 0}
              icon={CalendarDays}
              trend="Happening now"
              trendDirection="neutral"
            />
            <KpiCard
              title="Staff On Duty"
              value={kpis?.staffOnDuty ?? 0}
              icon={Users}
              trend="Across all locations"
              trendDirection="neutral"
            />
            <KpiCard
              title="Pending Swaps"
              value={kpis?.pendingSwaps ?? 0}
              icon={ArrowLeftRight}
              trend={
                (kpis?.pendingSwaps ?? 0) > 0
                  ? "Needs attention"
                  : "All clear"
              }
              trendDirection={
                (kpis?.pendingSwaps ?? 0) > 0 ? "down" : "up"
              }
            />
            <KpiCard
              title="Overtime Risk"
              value={kpis?.overtimeRisk ?? 0}
              icon={TrendingUp}
              trend={
                (kpis?.overtimeRisk ?? 0) > 0
                  ? `${kpis?.overtimeRisk} staff near/over 40h`
                  : "No overtime flags"
              }
              trendDirection={
                (kpis?.overtimeRisk ?? 0) > 0 ? "down" : "up"
              }
            />
          </>
        )}
      </div>
      </SectionErrorBoundary>

      {/* On-duty grid */}
      <SectionErrorBoundary section="On-Duty" compact>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who&apos;s On Duty Now</CardTitle>
          <CardDescription>
            Live view of active shifts per location. Updates in real time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No locations configured.
            </p>
          ) : (
            <OnDutyGrid locations={locations} />
          )}
        </CardContent>
      </Card>
      </SectionErrorBoundary>
    </div>
  );
}

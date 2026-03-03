"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { startOfWeek, endOfWeek } from "date-fns";
import {
  CalendarDays,
  Users,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/admin/kpi-card";
import { OnDutyGrid } from "@/components/admin/on-duty-grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

interface KpiData {
  weekShifts: number;
  staffAvailable: number;
  pendingSwaps: number;
  overtimeAlerts: number;
}

export default function ManagerDashboardPage() {
  const { locations, selectedLocationId } = useDashboard();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  const locationId = selectedLocationId ?? locations[0]?.id ?? "";

  const fetchKpis = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const [shiftsRes, staffRes, swapsRes, analyticsRes] = await Promise.all([
        fetch(
          `/api/shifts?locationId=${locationId}&weekStart=${weekStart.toISOString()}`
        ),
        fetch(`/api/staff?locationId=${locationId}`),
        fetch("/api/swaps?status=PENDING_MANAGER"),
        fetch(
          `/api/analytics?locationId=${locationId}&from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
        ),
      ]);

      const [shiftsJson, staffJson, swapsJson, analyticsJson] =
        await Promise.all([
          shiftsRes.json(),
          staffRes.json(),
          swapsRes.json(),
          analyticsRes.json(),
        ]);

      setKpis({
        weekShifts: Array.isArray(shiftsJson.data)
          ? shiftsJson.data.length
          : 0,
        staffAvailable: Array.isArray(staffJson.data)
          ? staffJson.data.length
          : 0,
        pendingSwaps: Array.isArray(swapsJson.data)
          ? swapsJson.data.length
          : 0,
        overtimeAlerts:
          analyticsJson.data?.overtimeRisk?.filter(
            (o: { isOvertime: boolean; isWarning: boolean }) =>
              o.isOvertime || o.isWarning
          )?.length ?? 0,
      });
    } catch {
      // Partial data is OK
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Filter locations to just the selected one for on-duty grid
  const displayLocations = locations.filter(
    (l) => !selectedLocationId || l.id === selectedLocationId
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your location at a glance.
        </p>
      </div>

      {/* KPI cards */}
      <SectionErrorBoundary section="KPIs" compact>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))
          ) : (
            <>
              <KpiCard
                title="This Week's Shifts"
                value={kpis?.weekShifts ?? 0}
                icon={CalendarDays}
                trend="Scheduled this week"
                trendDirection="neutral"
              />
              <KpiCard
                title="Staff Available"
                value={kpis?.staffAvailable ?? 0}
                icon={Users}
                trend="Certified at location"
                trendDirection="neutral"
              />
              <KpiCard
                title="Pending Swaps"
                value={kpis?.pendingSwaps ?? 0}
                icon={ArrowLeftRight}
                trend={
                  (kpis?.pendingSwaps ?? 0) > 0
                    ? "Needs your attention"
                    : "All clear"
                }
                trendDirection={
                  (kpis?.pendingSwaps ?? 0) > 0 ? "down" : "up"
                }
              />
              <KpiCard
                title="Overtime Alerts"
                value={kpis?.overtimeAlerts ?? 0}
                icon={AlertTriangle}
                trend={
                  (kpis?.overtimeAlerts ?? 0) > 0
                    ? "Staff near/over 40h"
                    : "No overtime flags"
                }
                trendDirection={
                  (kpis?.overtimeAlerts ?? 0) > 0 ? "down" : "up"
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
            <CardTitle className="text-base">
              Who&apos;s On Duty Now
            </CardTitle>
            <CardDescription>
              Live view of active shifts. Updates in real time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No locations assigned.
              </p>
            ) : (
              <OnDutyGrid locations={displayLocations} />
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>
    </div>
  );
}

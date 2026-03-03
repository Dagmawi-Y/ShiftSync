"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import {
  startOfWeek,
  endOfWeek,
  differenceInHours,
  format,
  isAfter,
  isBefore,
  addWeeks,
} from "date-fns";
import {
  CalendarDays,
  Clock,
  ArrowLeftRight,
  CalendarClock,
} from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/admin/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getSkillColor,
  formatSkillLabel,
} from "@/components/schedule/shift-card";
import { cn } from "@/lib/utils";

interface ShiftRecord {
  id: string;
  requiredSkill: string;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  isPremium: boolean;
  location: { id: string; name: string; timezone: string };
  assignments: { id: string; profileId: string; profile: { id: string; name: string; email: string } }[];
}

interface KpiData {
  upcomingShifts: number;
  hoursThisWeek: number;
  pendingSwaps: number;
  nextShiftLabel: string;
}

export default function StaffDashboardPage() {
  const { profile } = useDashboard();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekEnd = addWeeks(weekEnd, 1);

      const [shiftsRes, swapsRes] = await Promise.all([
        fetch(`/api/shifts?weekStart=${weekStart.toISOString()}`),
        fetch("/api/swaps"),
      ]);

      const [shiftsJson, swapsJson] = await Promise.all([
        shiftsRes.json(),
        swapsRes.json(),
      ]);

      const allShifts: ShiftRecord[] = shiftsJson.data ?? [];
      const myShifts = allShifts.filter((s) =>
        s.assignments.some((a) => a.profileId === profile.id)
      );

      // Upcoming = future shifts I'm assigned to
      const upcoming = myShifts
        .filter((s) => isAfter(new Date(s.endTime), now))
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

      // Hours this week
      const thisWeekShifts = myShifts.filter((s) => {
        const start = new Date(s.startTime);
        return (
          isAfter(start, weekStart) &&
          isBefore(start, weekEnd)
        );
      });
      const hoursThisWeek = thisWeekShifts.reduce(
        (sum, s) =>
          sum +
          differenceInHours(new Date(s.endTime), new Date(s.startTime)),
        0
      );

      // Pending swaps
      const swaps = swapsJson.data ?? [];
      const pending = swaps.filter(
        (s: { status: string }) =>
          s.status === "PENDING_STAFF" || s.status === "PENDING_MANAGER"
      );

      // Next shift label
      const nextShift = upcoming[0];
      const nextShiftLabel = nextShift
        ? format(new Date(nextShift.startTime), "EEE, MMM d · h:mm a")
        : "No upcoming shifts";

      setKpis({
        upcomingShifts: upcoming.length,
        hoursThisWeek,
        pendingSwaps: pending.length,
        nextShiftLabel,
      });

      // Also fetch next week's shifts for the upcoming list
      const nextWeekRes = await fetch(
        `/api/shifts?weekStart=${addWeeks(weekStart, 1).toISOString()}`
      );
      const nextWeekJson = await nextWeekRes.json();
      const nextWeekShifts: ShiftRecord[] = nextWeekJson.data ?? [];
      const myNextWeekShifts = nextWeekShifts.filter((s) =>
        s.assignments.some((a) => a.profileId === profile.id)
      );

      const allUpcoming = [...upcoming, ...myNextWeekShifts.filter(
        (s) => isAfter(new Date(s.endTime), now) && isBefore(new Date(s.startTime), nextWeekEnd)
      )]
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .slice(0, 8);

      setUpcomingShifts(allUpcoming);
    } catch {
      // Partial data is OK
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your schedule overview and recent activity.
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
                title="Upcoming Shifts"
                value={kpis?.upcomingShifts ?? 0}
                icon={CalendarDays}
                trend={kpis?.nextShiftLabel ?? ""}
                trendDirection="neutral"
              />
              <KpiCard
                title="Hours This Week"
                value={kpis?.hoursThisWeek ?? 0}
                icon={Clock}
                trend={
                  (kpis?.hoursThisWeek ?? 0) >= 40
                    ? "At or over 40h"
                    : `${40 - (kpis?.hoursThisWeek ?? 0)}h until 40h`
                }
                trendDirection={
                  (kpis?.hoursThisWeek ?? 0) >= 40 ? "down" : "up"
                }
              />
              <KpiCard
                title="Pending Swaps"
                value={kpis?.pendingSwaps ?? 0}
                icon={ArrowLeftRight}
                trend={
                  (kpis?.pendingSwaps ?? 0) > 0
                    ? "Awaiting response"
                    : "No open requests"
                }
                trendDirection="neutral"
              />
              <KpiCard
                title="Next Shift"
                value={kpis?.upcomingShifts ? "—" : "None"}
                icon={CalendarClock}
                trend={kpis?.nextShiftLabel ?? ""}
                trendDirection="neutral"
              />
            </>
          )}
        </div>
      </SectionErrorBoundary>

      {/* Upcoming shifts list */}
      <SectionErrorBoundary section="Upcoming Shifts" compact>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Shifts</CardTitle>
            <CardDescription>
              Your assigned shifts for the next two weeks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-muted/40 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : upcomingShifts.length === 0 ? (
              <EmptyState
                preset="schedule"
                message="No upcoming shifts assigned to you."
                compact
              />
            ) : (
              <div className="space-y-2">
                {upcomingShifts.map((shift) => {
                  const colors = getSkillColor(shift.requiredSkill);
                  const date = format(
                    new Date(shift.startTime),
                    "EEE, MMM d"
                  );
                  const time = `${format(new Date(shift.startTime), "h:mm a")} – ${format(new Date(shift.endTime), "h:mm a")}`;
                  const hours = differenceInHours(
                    new Date(shift.endTime),
                    new Date(shift.startTime)
                  );

                  return (
                    <div
                      key={shift.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        colors.bg,
                        colors.border
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              colors.text,
                              colors.border
                            )}
                          >
                            {formatSkillLabel(shift.requiredSkill)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {shift.location.name}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {date} · {time}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold font-display">
                          {hours}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>
    </div>
  );
}

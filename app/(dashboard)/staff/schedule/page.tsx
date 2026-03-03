"use client";

import { useState, useCallback, useEffect } from "react";
import { startOfWeek, format } from "date-fns";
import { useDashboard } from "@/lib/dashboard-context";
import { WeekNavigator } from "@/components/schedule/week-navigator";
import {
  PersonalCalendar,
  PersonalCalendarSkeleton,
} from "@/components/staff/personal-calendar";

export default function StaffSchedulePage() {
  const { profile } = useDashboard();

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/shifts?weekStart=${weekStart.toISOString()}`
      );
      const json = await res.json();
      if (json.success) setShifts(json.data);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            My Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your assigned shifts for the week.
          </p>
        </div>
        <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto pb-4">
        {loading ? (
          <PersonalCalendarSkeleton />
        ) : (
          <PersonalCalendar
            shifts={shifts}
            weekStart={weekStart}
            profileId={profile.id}
          />
        )}
      </div>
    </div>
  );
}

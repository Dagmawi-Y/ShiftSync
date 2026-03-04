"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface Shift {
  id: string;
  locationId: string;
  requiredSkill: string;
  headcount: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  isPremium: boolean;
  location: { id: string; name: string; timezone: string };
  assignments: {
    id: string;
    profileId: string;
    profile: { id: string; name: string; email: string };
  }[];
}

/**
 * Fetches and live-updates the weekly schedule.
 *
 * When a manager publishes a schedule or edits a shift,
 * all connected clients see the update without refreshing.
 *
 * Also detects concurrent assignment conflicts:
 * if two managers are looking at the same week and one assigns
 * a staff member, the other sees the assignment appear in real-time
 * — preventing them from trying to assign the same person.
 */
export function useSchedule(locationId: string, weekStart: string) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedShiftId, setLastUpdatedShiftId] = useState<string | null>(null);

  const weekStartMs = new Date(weekStart).getTime();
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

  const scheduleShiftIds = useMemo(
    () => new Set(shifts.map((shift) => shift.id)),
    [shifts]
  );
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/shifts?locationId=${locationId}&weekStart=${weekStart}`
      );
      const json = await res.json();
      if (json.success) setShifts(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to fetch schedule");
    } finally {
      setLoading(false);
    }
  }, [locationId, weekStart]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const queueRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    refetchTimeoutRef.current = setTimeout(() => {
      fetchSchedule();
      refetchTimeoutRef.current = null;
    }, 150);
  }, [fetchSchedule]);

  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  const isShiftInVisibleWeek = useCallback(
    (startTime?: string | null) => {
      if (!startTime) return false;
      const shiftStartMs = new Date(startTime).getTime();
      return shiftStartMs >= weekStartMs && shiftStartMs < weekEndMs;
    },
    [weekEndMs, weekStartMs]
  );

  // Listen for shift changes at this location
  useRealtimeSubscription({
    table: "Shift",
    event: "*",
    filter: `locationId=eq.${locationId}`,
    onchange: (payload) => {
      const record = (payload.new || payload.old) as
        | { id?: string; startTime?: string }
        | null;

      if (!record) return;

      if (record.id) {
        setLastUpdatedShiftId(record.id);
      }

      if (
        isShiftInVisibleWeek(record.startTime) ||
        (record.id ? scheduleShiftIds.has(record.id) : false)
      ) {
        queueRefetch();
      }
    },
  });

  useRealtimeSubscription({
    table: "ShiftAssignment",
    event: "*",
    onchange: (payload) => {
      const record = (payload.new || payload.old) as { shiftId?: string } | null;
      if (!record?.shiftId) return;

      if (scheduleShiftIds.has(record.shiftId)) {
        queueRefetch();
      }
    },
  });

  return { shifts, loading, error, lastUpdatedShiftId, refetch: fetchSchedule };
}
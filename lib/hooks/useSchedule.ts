"use client";

import { useCallback, useEffect, useState } from "react";
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
  // Track when a shift was just updated — UI can flash/highlight it
  const [lastUpdatedShiftId, setLastUpdatedShiftId] = useState<string | null>(null);

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

  // Listen for shift changes at this location
  useRealtimeSubscription({
    table: "Shift",
    event: "*",
    filter: `locationId=eq.${locationId}`,
    onchange: (payload) => {
      // Track which shift changed so the UI can highlight it
      const record = payload.new as { id?: string } | null;
      if (record?.id) setLastUpdatedShiftId(record.id);
      fetchSchedule();
    },
  });

  // Listen for assignment changes — this is the concurrent conflict detection
  // If Manager A assigns Sarah, Manager B sees Sarah's cell fill in real-time
  useRealtimeSubscription({
    table: "ShiftAssignment",
    event: "*",
    onchange: () => {
      fetchSchedule();
    },
  });

  return { shifts, loading, error, lastUpdatedShiftId, refetch: fetchSchedule };
}
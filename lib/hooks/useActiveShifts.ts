"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface AssignedStaff {
  id: string;
  name: string;
  email: string;
}

interface ActiveShift {
  id: string;
  startTime: string;
  endTime: string;
  requiredSkill: string;
  location: { id: string; name: string; timezone: string };
  assignments: { profile: AssignedStaff }[];
}

interface ActiveShiftsResponse {
  asOf: string;
  shifts: ActiveShift[];
}

/**
 * Powers the "on-duty now" live dashboard.
 *
 * Strategy:
 * - Initial fetch on mount
 * - Re-fetches when ANY shift or assignment changes via Realtime
 * - This is the "invalidate and refetch" pattern — simpler and more
 *   correct than trying to merge real-time payloads into local state
 */
export function useActiveShifts(locationId?: string) {
  const [data, setData] = useState<ActiveShiftsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveShifts = useCallback(async () => {
    try {
      const params = locationId ? `?locationId=${locationId}` : "";
      const res = await fetch(`/api/shifts/active${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch {
      setError("Failed to fetch active shifts");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // Initial fetch
  useEffect(() => {
    fetchActiveShifts();
  }, [fetchActiveShifts]);

  // Re-fetch when shift rows change
  useRealtimeSubscription({
    table: "Shift",
    event: "*",
    ...(locationId ? { filter: `locationId=eq.${locationId}` } : {}),
    onchange: fetchActiveShifts,
  });

  // Re-fetch when assignment rows change (someone added/removed from a shift)
  useRealtimeSubscription({
    table: "ShiftAssignment",
    event: "*",
    onchange: fetchActiveShifts,
  });

  return { data, loading, error, refetch: fetchActiveShifts };
}
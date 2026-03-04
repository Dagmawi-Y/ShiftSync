"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const activeShiftIds = useMemo(
    () => new Set((data?.shifts ?? []).map((shift) => shift.id)),
    [data]
  );
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const queueRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    refetchTimeoutRef.current = setTimeout(() => {
      fetchActiveShifts();
      refetchTimeoutRef.current = null;
    }, 150);
  }, [fetchActiveShifts]);

  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  const isShiftPotentiallyActive = useCallback(
    (startTime?: string, endTime?: string) => {
      if (!startTime || !endTime) return true;

      const now = Date.now();
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      if (Number.isNaN(start) || Number.isNaN(end)) return true;
      return start <= now && end > now;
    },
    []
  );

  // Re-fetch when shift rows change
  useRealtimeSubscription({
    table: "Shift",
    event: "*",
    ...(locationId ? { filter: `locationId=eq.${locationId}` } : {}),
    onchange: (payload) => {
      const record = (payload.new || payload.old) as
        | { id?: string; startTime?: string; endTime?: string }
        | null;

      if (!record) {
        queueRefetch();
        return;
      }

      if (
        (record.id && activeShiftIds.has(record.id)) ||
        isShiftPotentiallyActive(record.startTime, record.endTime)
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

      if (activeShiftIds.has(record.shiftId)) {
        queueRefetch();
      }
    },
  });

  return { data, loading, error, refetch: fetchActiveShifts };
}
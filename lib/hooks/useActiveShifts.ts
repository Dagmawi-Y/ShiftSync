"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
  const queryClient = useQueryClient();
  const queryKey = ["active-shifts", locationId ?? "all"] as const;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ActiveShiftsResponse>({
    queryKey,
    queryFn: async () => {
      const params = locationId ? `?locationId=${locationId}` : "";
      const res = await fetch(`/api/shifts/active${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to fetch active shifts");
      }

      return json.data;
    },
  });

  const activeShiftIds = useMemo(
    () => new Set((data?.shifts ?? []).map((shift) => shift.id)),
    [data]
  );
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }

    refetchTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey });
      refetchTimeoutRef.current = null;
    }, 150);
  }, [queryClient, queryKey]);

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

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
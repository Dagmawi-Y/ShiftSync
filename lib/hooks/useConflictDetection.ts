"use client";

import { useEffect, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface ConflictAlert {
  staffId: string;
  shiftId: string;
  message: string;
}

/**
 * Concurrent manager conflict detection.
 *
 * Scenario: Manager A and Manager B both have the schedule open.
 * Both are looking at the same bartender (staffId) to assign.
 * Manager A assigns them first. Manager B's UI immediately shows
 * a conflict alert — "This staff member was just assigned by
 * another manager" — before they can submit.
 *
 * How it works:
 * - Watches ShiftAssignment inserts in real-time
 * - If a new assignment comes in for a staff member the current
 *   manager was "considering" (passed as watchedStaffIds),
 *   surfaces a conflict alert
 *
 * Usage:
 * const { conflicts, clearConflict } = useConflictDetection(
 *   staffIdsCurrentlyBeingConsidered
 * )
 */
export function useConflictDetection(watchedStaffIds: string[]) {
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);

  // Keep a ref of watched IDs so the subscription callback
  // always has the latest value without re-subscribing
  const [watchedSet, setWatchedSet] = useState(new Set(watchedStaffIds));

  useEffect(() => {
    setWatchedSet(new Set(watchedStaffIds));
  }, [watchedStaffIds]);

  useRealtimeSubscription({
    table: "ShiftAssignment",
    event: "INSERT",
    onchange: (payload) => {
      const newAssignment = payload.new as {
        profileId: string;
        shiftId: string;
      };

      if (watchedSet.has(newAssignment.profileId)) {
        setConflicts((prev) => [
          ...prev,
          {
            staffId: newAssignment.profileId,
            shiftId: newAssignment.shiftId,
            message:
              "This staff member was just assigned to a shift by another manager. Please review before proceeding.",
          },
        ]);
      }
    },
  });

  const clearConflict = (staffId: string) => {
    setConflicts((prev) => prev.filter((c) => c.staffId !== staffId));
  };

  const clearAll = () => setConflicts([]);

  return { conflicts, clearConflict, clearAll };
}
"use client";

import { useState, useCallback } from "react";
import { startOfWeek } from "date-fns";
import { Plus } from "lucide-react";

import { useDashboard } from "@/lib/dashboard-context";
import { useSchedule } from "@/lib/hooks/useSchedule";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { WeekNavigator } from "@/components/schedule/week-navigator";
import { WeeklyGrid, WeeklyGridSkeleton } from "@/components/schedule/weekly-grid";
import { ShiftDetailPanel } from "@/components/schedule/shift-detail-panel";
import { CreateShiftDialog } from "@/components/schedule/create-shift-dialog";
import { PublishBar } from "@/components/schedule/publish-bar";
import { toast } from "sonner";
import type { ShiftData } from "@/components/schedule/shift-card";

export default function AdminSchedulePage() {
  const { selectedLocationId, locations } = useDashboard();

  // Week navigation
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // The schedule hook — live-updating via Supabase Realtime
  const locationId = selectedLocationId ?? locations[0]?.id ?? "";
  const { shifts, loading, lastUpdatedShiftId, refetch } = useSchedule(
    locationId,
    weekStart.toISOString()
  );

  // Detail panel state
  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>();

  // ─── Handlers ────────────────────────────────────────────

  const handleShiftClick = useCallback((shift: ShiftData) => {
    setSelectedShift(shift);
  }, []);

  const handleCreateShift = useCallback((date: Date) => {
    setCreateDefaultDate(date);
    setCreateDialogOpen(true);
  }, []);

  const handleDeleteShift = useCallback(
    async (shiftId: string) => {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Shift deleted");
        refetch();
      } else {
        toast.error(json.error || "Failed to delete shift");
      }
    },
    [refetch]
  );

  const handlePanelClose = useCallback(() => {
    setSelectedShift(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    if (selectedShift) {
      const updated = shifts.find((s) => s.id === selectedShift.id);
      if (updated) setSelectedShift(updated);
    }
  }, [refetch, selectedShift, shifts]);

  // ─── Keyboard shortcuts ──────────────────────────────────

  useKeyboardShortcuts([
    {
      key: "n",
      handler: () => {
        if (locationId) {
          setCreateDefaultDate(undefined);
          setCreateDialogOpen(true);
        }
      },
    },
    {
      key: "Escape",
      handler: () => {
        if (selectedShift) handlePanelClose();
        else if (createDialogOpen) setCreateDialogOpen(false);
      },
      ignoreWhenEditing: false,
    },
  ]);

  if (!locationId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Select a location from the sidebar to view the schedule.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full schedule overview across all locations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
          <Button
            size="sm"
            onClick={() => {
              setCreateDefaultDate(undefined);
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            New Shift
          </Button>
        </div>
      </div>

      {/* Publish bar */}
      <PublishBar shifts={shifts} onPublished={refetch} />

      {/* Weekly grid */}
      <div className="overflow-x-auto pb-4">
        {loading ? (
          <WeeklyGridSkeleton />
        ) : (
          <WeeklyGrid
            shifts={shifts}
            weekStart={weekStart}
            highlightedShiftId={lastUpdatedShiftId}
            onShiftClick={handleShiftClick}
            onCreateShift={handleCreateShift}
          />
        )}
      </div>

      {/* Shift detail slide-out panel */}
      <ShiftDetailPanel
        shift={selectedShift}
        onClose={handlePanelClose}
        onDelete={handleDeleteShift}
        onRefresh={handleRefresh}
      />

      {/* Create shift dialog */}
      <CreateShiftDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        locationId={locationId}
        defaultDate={createDefaultDate}
        onCreated={refetch}
      />
    </div>
  );
}

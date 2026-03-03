"use client";

import {
  addDays,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ShiftCard, type ShiftData } from "./shift-card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ───────────────────────────────────────────────

interface WeeklyGridProps {
  shifts: ShiftData[];
  weekStart: Date;
  /** The shift ID that was just updated via real-time — highlight it */
  highlightedShiftId?: string | null;
  onShiftClick: (shift: ShiftData) => void;
  onCreateShift: (date: Date) => void;
}

// ─── Helpers ─────────────────────────────────────────────

function getDaysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function getShiftsForDay(shifts: ShiftData[], day: Date): ShiftData[] {
  return shifts.filter((s) =>
    isSameDay(new Date(s.startTime), day)
  );
}

// ─── Grid skeleton for loading ───────────────────────────

export function WeeklyGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-8 rounded-md bg-muted animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
              <div
                key={j}
                className="h-24 rounded-lg bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────

export function WeeklyGrid({
  shifts,
  weekStart,
  highlightedShiftId,
  onShiftClick,
  onCreateShift,
}: WeeklyGridProps) {
  const days = getDaysOfWeek(weekStart);

  return (
    <div className="grid grid-cols-7 gap-3 min-w-[800px]">
      {days.map((day) => {
        const dayShifts = getShiftsForDay(shifts, day);
        const today = isToday(day);

        return (
          <div key={day.toISOString()} className="flex flex-col">
            {/* Day header */}
            <div
              className={cn(
                "flex flex-col items-center pb-2 mb-2 border-b",
                today && "border-primary"
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "text-lg font-bold font-display",
                  today
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
            </div>

            {/* Shift cards */}
            <div className="flex-1 space-y-2">
              {dayShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                  <span className="text-xs">No shifts</span>
                </div>
              ) : (
                dayShifts.map((shift, i) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    isHighlighted={shift.id === highlightedShiftId}
                    onClick={() => onShiftClick(shift)}
                    staggerIndex={i}
                  />
                ))
              )}
            </div>

            {/* Add shift button */}
            <Button
              variant="ghost"
              size="xs"
              className="mt-2 w-full text-muted-foreground/50 hover:text-muted-foreground"
              onClick={() => onCreateShift(day)}
            >
              <Plus className="size-3" />
              <span className="text-[11px]">Add</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

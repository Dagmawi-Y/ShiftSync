"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

const TIME_SLOTS = [
  { start: "06:00", end: "10:00", label: "Morning", sub: "6 AM – 10 AM" },
  { start: "10:00", end: "14:00", label: "Midday", sub: "10 AM – 2 PM" },
  { start: "14:00", end: "18:00", label: "Afternoon", sub: "2 PM – 6 PM" },
  { start: "18:00", end: "22:00", label: "Evening", sub: "6 PM – 10 PM" },
  { start: "22:00", end: "02:00", label: "Night", sub: "10 PM – 2 AM" },
] as const;

export interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityGridProps {
  availability: AvailabilitySlot[];
  onToggle: (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isAvailable: boolean
  ) => Promise<void>;
  saving?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

function isSlotAvailable(
  availability: AvailabilitySlot[],
  dayOfWeek: number,
  startTime: string,
  endTime: string
): boolean {
  const match = availability.find(
    (a) =>
      a.dayOfWeek === dayOfWeek &&
      a.startTime === startTime &&
      a.endTime === endTime
  );
  // Default to available if no record exists
  return match ? match.isAvailable : true;
}

// ─── Component ───────────────────────────────────────────

export function AvailabilityGrid({
  availability,
  onToggle,
  saving,
}: AvailabilityGridProps) {
  const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());

  const handleCellClick = useCallback(
    async (dayOfWeek: number, startTime: string, endTime: string) => {
      const key = `${dayOfWeek}-${startTime}`;
      if (pendingCells.has(key)) return;

      const currentlyAvailable = isSlotAvailable(
        availability,
        dayOfWeek,
        startTime,
        endTime
      );

      setPendingCells((prev) => new Set(prev).add(key));
      try {
        await onToggle(dayOfWeek, startTime, endTime, !currentlyAvailable);
      } finally {
        setPendingCells((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [availability, onToggle, pendingCells]
  );

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5">
        <div /> {/* empty corner */}
        {DAYS.map((day) => (
          <div
            key={day.value}
            className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1"
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Time slot rows */}
      {TIME_SLOTS.map((slot) => (
        <div
          key={slot.start}
          className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5"
        >
          {/* Row label */}
          <div className="flex flex-col justify-center text-right pr-3">
            <span className="text-xs font-medium text-foreground">
              {slot.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {slot.sub}
            </span>
          </div>

          {/* Day cells */}
          {DAYS.map((day) => {
            const available = isSlotAvailable(
              availability,
              day.value,
              slot.start,
              slot.end
            );
            const key = `${day.value}-${slot.start}`;
            const isPending = pendingCells.has(key);

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  handleCellClick(day.value, slot.start, slot.end)
                }
                disabled={isPending || saving}
                className={cn(
                  "relative h-12 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer",
                  available
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                    : "bg-muted/30 border-border hover:bg-muted/50",
                  isPending && "opacity-60 cursor-wait"
                )}
              >
                {available ? (
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <X className="size-3.5 text-muted-foreground/40" />
                )}
              </motion.button>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded bg-muted/30 border border-border" />
          Unavailable
        </div>
        <span className="text-muted-foreground/50 ml-auto">
          Click to toggle
        </span>
      </div>
    </div>
  );
}

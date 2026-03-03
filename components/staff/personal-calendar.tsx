"use client";

import { useMemo } from "react";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  isPast,
  differenceInHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Star,
  ArrowLeftRight,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatSkillLabel, getSkillColor } from "@/components/schedule/shift-card";

// ─── Types ───────────────────────────────────────────────

interface ShiftAssignment {
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

interface PersonalCalendarProps {
  shifts: ShiftAssignment[];
  weekStart: Date;
  profileId: string;
  onShiftClick?: (shift: ShiftAssignment) => void;
}

// ─── Skeleton ────────────────────────────────────────────

export function PersonalCalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-8 rounded-md bg-muted animate-pulse" />
          <div className="h-20 rounded-lg bg-muted/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────

export function PersonalCalendar({
  shifts,
  weekStart,
  profileId,
  onShiftClick,
}: PersonalCalendarProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Filter to only shifts where this user is assigned
  const myShifts = useMemo(
    () =>
      shifts.filter((s) =>
        s.assignments.some((a) => a.profileId === profileId)
      ),
    [shifts, profileId]
  );

  // Total hours this week
  const totalHours = useMemo(
    () =>
      myShifts.reduce(
        (sum, s) =>
          sum +
          differenceInHours(new Date(s.endTime), new Date(s.startTime)),
        0
      ),
    [myShifts]
  );

  return (
    <div className="space-y-4">
      {/* Week summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{myShifts.length}</span>{" "}
          shift{myShifts.length !== 1 && "s"} this week
        </span>
        <span className="text-border">·</span>
        <span>
          <span className="font-semibold text-foreground">{totalHours}</span>h
          total
        </span>
        {totalHours > 35 && (
          <Badge
            variant="outline"
            className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]"
          >
            {totalHours > 40 ? "Overtime" : "Near overtime"}
          </Badge>
        )}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-3 min-w-[700px]">
        {days.map((day) => {
          const dayShifts = myShifts.filter((s) =>
            isSameDay(new Date(s.startTime), day)
          );
          const today = isToday(day);
          const past = isPast(day) && !today;

          return (
            <div
              key={day.toISOString()}
              className={cn("flex flex-col", past && "opacity-60")}
            >
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
                    today ? "text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Shift cards */}
              <div className="flex-1 space-y-2">
                {dayShifts.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground/30">
                    <span className="text-xs">Off</span>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <PersonalShiftCard
                      key={shift.id}
                      shift={shift}
                      onClick={() => onShiftClick?.(shift)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Personal Shift Card ─────────────────────────────────

function PersonalShiftCard({
  shift,
  onClick,
}: {
  shift: ShiftAssignment;
  onClick?: () => void;
}) {
  const colors = getSkillColor(shift.requiredSkill);
  const timeRange = `${format(new Date(shift.startTime), "h:mm a")} – ${format(new Date(shift.endTime), "h:mm a")}`;
  const locationName =
    shift.location.name.split("—")[1]?.trim() ?? shift.location.name;
  const hours = differenceInHours(
    new Date(shift.endTime),
    new Date(shift.startTime)
  );

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-2.5 transition-all hover:shadow-md cursor-pointer",
        colors.bg,
        colors.border
      )}
    >
      {/* Skill + premium */}
      <div className="flex items-center gap-1.5 mb-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4",
            colors.text,
            colors.border
          )}
        >
          {formatSkillLabel(shift.requiredSkill)}
        </Badge>
        {shift.isPremium && (
          <Star className="size-3 text-yellow-500 fill-yellow-500" />
        )}
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-[11px] text-foreground/80 mb-1">
        <Clock className="size-3 text-muted-foreground" />
        <span className="font-medium">{timeRange}</span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <MapPin className="size-3" />
        <span className="truncate">{locationName}</span>
        <span className="ml-auto text-[10px] font-medium">{hours}h</span>
      </div>
    </motion.button>
  );
}

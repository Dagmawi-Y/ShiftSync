"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  format,
  isThisWeek,
} from "date-fns";

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (weekStart: Date) => void;
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const isCurrent = isThisWeek(weekStart, { weekStartsOn: 1 });

  const label =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`
      : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(subWeeks(weekStart, 1))}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">Previous week</span>
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium min-w-[180px] text-center">
          {label}
        </span>
        {!isCurrent && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              onChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
          >
            Today
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(addWeeks(weekStart, 1))}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Next week</span>
      </Button>
    </div>
  );
}

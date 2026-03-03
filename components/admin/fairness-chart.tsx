"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────

export interface FairnessEntry {
  id: string;
  name: string;
  totalHours: number;
  totalShifts: number;
  desiredHours: number | null;
  premiumShifts: number;
  premiumShiftDelta: number;
  hoursVsDesired: number | null;
}

interface FairnessChartProps {
  data: FairnessEntry[];
  loading?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function FairnessChart({ data, loading }: FairnessChartProps) {
  // Sort by total hours descending
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.totalHours - a.totalHours),
    [data]
  );

  const maxHours = useMemo(
    () => Math.max(...sorted.map((d) => d.totalHours), 1),
    [sorted]
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 h-4 bg-muted rounded" />
            <div className="flex-1 h-6 bg-muted/40 rounded" />
            <div className="w-10 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No data for this period.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((entry) => {
        const pct = (entry.totalHours / maxHours) * 100;
        const isOver = entry.hoursVsDesired !== null && entry.hoursVsDesired > 0;
        const isUnder =
          entry.hoursVsDesired !== null && entry.hoursVsDesired < -4;
        const premiumHigh = entry.premiumShiftDelta > 1;
        const premiumLow = entry.premiumShiftDelta < -1;

        return (
          <div key={entry.id} className="group">
            <div className="flex items-center gap-3">
              {/* Name */}
              <div className="w-28 shrink-0 truncate text-sm font-medium" title={entry.name}>
                {entry.name}
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-7 bg-muted/30 rounded overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded transition-all duration-500",
                    isOver
                      ? "bg-red-200 dark:bg-red-900/40"
                      : isUnder
                        ? "bg-amber-200 dark:bg-amber-900/40"
                        : "bg-primary/20"
                  )}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
                {/* Inner label */}
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium">
                    {entry.totalHours}h
                  </span>
                  {entry.desiredHours && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      / {entry.desiredHours}h desired
                    </span>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {entry.totalShifts} shifts
                </Badge>
                {premiumHigh && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  >
                    +{entry.premiumShiftDelta.toFixed(0)} premium
                  </Badge>
                )}
                {premiumLow && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  >
                    {entry.premiumShiftDelta.toFixed(0)} premium
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground border-t mt-2">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm bg-primary/20" />
          On target
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm bg-amber-200 dark:bg-amber-900/40" />
          Under-scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm bg-red-200 dark:bg-red-900/40" />
          Over desired
        </div>
      </div>
    </div>
  );
}

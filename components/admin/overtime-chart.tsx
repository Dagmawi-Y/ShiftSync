"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

export interface OvertimeEntry {
  staffId: string;
  name: string;
  projectedHours: number;
  overtimeHours: number;
  isOvertime: boolean;
  isWarning: boolean;
}

interface OvertimeChartProps {
  data: OvertimeEntry[];
  loading?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function OvertimeChart({ data, loading }: OvertimeChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.projectedHours - a.projectedHours),
    [data]
  );

  // Max for bar scaling (cap at 60 so bars are proportional)
  const max = useMemo(
    () => Math.max(...sorted.map((d) => d.projectedHours), 40),
    [sorted]
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 h-4 bg-muted rounded" />
            <div className="flex-1 h-7 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <TrendingUp className="size-8 text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          No overtime risk this period
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          All staff are within their weekly hour limits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((entry) => {
        // Split bar into regular (up to 40h) + overtime
        const regularPct = (Math.min(entry.projectedHours, 40) / max) * 100;
        const overtimePct = (entry.overtimeHours / max) * 100;

        return (
          <div key={entry.staffId} className="flex items-center gap-3">
            {/* Name */}
            <div className="w-28 shrink-0 truncate text-sm font-medium" title={entry.name}>
              {entry.name}
            </div>

            {/* Stacked bars */}
            <div className="flex-1 relative h-7 bg-muted/20 rounded overflow-hidden flex">
              {/* Regular portion */}
              <div
                className="h-full bg-primary/20 transition-all duration-500"
                style={{ width: `${regularPct}%` }}
              />
              {/* Overtime portion */}
              {entry.overtimeHours > 0 && (
                <div
                  className="h-full bg-red-300 dark:bg-red-800/50 transition-all duration-500"
                  style={{ width: `${overtimePct}%` }}
                />
              )}
              {/* 40h threshold line */}
              <div
                className="absolute inset-y-0 w-px bg-foreground/20"
                style={{ left: `${(40 / max) * 100}%` }}
              />
              {/* Inner label */}
              <div className="absolute inset-0 flex items-center px-2">
                <span className="text-xs font-medium">
                  {entry.projectedHours}h
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="shrink-0">
              {entry.isOvertime ? (
                <Badge
                  variant="destructive"
                  className="text-[10px]"
                >
                  <AlertTriangle className="size-2.5 mr-1" />
                  +{entry.overtimeHours}h OT
                </Badge>
              ) : entry.isWarning ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                >
                  Near limit
                </Badge>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground border-t mt-2">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm bg-primary/20" />
          Regular hours
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm bg-red-300 dark:bg-red-800/50" />
          Overtime (&gt;40h)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-foreground/20" />
          40h threshold
        </div>
      </div>
    </div>
  );
}

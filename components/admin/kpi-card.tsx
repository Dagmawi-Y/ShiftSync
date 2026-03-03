"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** e.g. "+12% vs last week" */
  trend?: string;
  /** positive = green, negative = red, neutral = muted */
  trendDirection?: "up" | "down" | "neutral";
  loading?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = "neutral",
  loading,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <Icon className="size-4 text-muted-foreground/50" />
      </div>

      {loading ? (
        <div className="mt-2 h-9 w-16 bg-muted rounded animate-pulse" />
      ) : (
        <p className="mt-2 text-3xl font-bold font-display">{value}</p>
      )}

      {trend && !loading && (
        <p
          className={cn(
            "mt-1 text-xs",
            trendDirection === "up" && "text-emerald-600 dark:text-emerald-400",
            trendDirection === "down" && "text-red-600 dark:text-red-400",
            trendDirection === "neutral" && "text-muted-foreground"
          )}
        >
          {trend}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────

export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="size-4 bg-muted rounded" />
      </div>
      <div className="mt-2 h-9 w-16 bg-muted rounded" />
      <div className="mt-1 h-3 w-24 bg-muted rounded" />
    </div>
  );
}

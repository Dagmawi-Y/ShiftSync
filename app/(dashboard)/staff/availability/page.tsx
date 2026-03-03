"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AvailabilityGrid,
  type AvailabilitySlot,
} from "@/components/staff/availability-grid";
import { Clock, CalendarDays } from "lucide-react";

export default function StaffAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch existing availability ────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/availability");
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        setAvailability(data.availability ?? []);
      } catch {
        toast.error("Could not load your availability");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Toggle a single slot ──────────────────────────────
  const handleToggle = useCallback(
    async (
      dayOfWeek: number,
      startTime: string,
      endTime: string,
      isAvailable: boolean
    ) => {
      setSaving(true);
      try {
        const res = await fetch("/api/availability", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayOfWeek, startTime, endTime, isAvailable }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update availability");
        }

        // Optimistically update local state
        setAvailability((prev) => {
          const idx = prev.findIndex(
            (a) =>
              a.dayOfWeek === dayOfWeek &&
              a.startTime === startTime &&
              a.endTime === endTime
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], isAvailable };
            return updated;
          }
          return [...prev, { dayOfWeek, startTime, endTime, isAvailable }];
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update availability"
        );
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ── Stats ─────────────────────────────────────────────
  const availableCount = availability.filter((a) => a.isAvailable).length;
  const totalSlots = 7 * 5; // 7 days × 5 time slots
  const unavailableCount = availability.filter((a) => !a.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          My Availability
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set recurring weekly availability so managers can schedule you for
          shifts you can work.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Available slots
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "–" : totalSlots - unavailableCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {totalSlots}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Blocked slots
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">
              {loading ? "–" : unavailableCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Availability grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Click any cell to toggle your availability. Changes are saved
            automatically and managers will be notified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AvailabilityGridSkeleton />
          ) : (
            <AvailabilityGrid
              availability={availability}
              onToggle={handleToggle}
              saving={saving}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────
function AvailabilityGridSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5">
        <div />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded mx-auto w-8" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5"
        >
          <div className="h-6 bg-muted rounded w-16 ml-auto" />
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="h-12 bg-muted/40 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

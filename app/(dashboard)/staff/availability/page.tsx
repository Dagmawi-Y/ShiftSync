"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AvailabilityGrid,
  type AvailabilitySlot,
} from "@/components/staff/availability-grid";
import { Clock, CalendarDays, Plus, X, CalendarOff } from "lucide-react";

export default function StaffAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<
    { id: string; specificDate: string; startTime: string; endTime: string; isAvailable: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Exception form state
  const [excDate, setExcDate] = useState("");
  const [excType, setExcType] = useState<"unavailable" | "custom">("unavailable");
  const [excStart, setExcStart] = useState("09:00");
  const [excEnd, setExcEnd] = useState("17:00");
  const [addingExc, setAddingExc] = useState(false);

  // ── Fetch existing availability ────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/availability");
        if (!res.ok) throw new Error("Failed to load availability");
        const json = await res.json();
        const all = json.data ?? json.availability ?? [];
        // Split recurring vs date-specific
        setAvailability(all.filter((a: any) => a.dayOfWeek !== null && a.dayOfWeek !== undefined));
        setExceptions(all.filter((a: any) => a.specificDate !== null && a.specificDate !== undefined));
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

  // ── Add date exception ────────────────────────────────
  const handleAddException = useCallback(async () => {
    if (!excDate) {
      toast.error("Select a date");
      return;
    }
    setAddingExc(true);
    try {
      const body: any = {
        specificDate: new Date(excDate).toISOString(),
        startTime: excType === "unavailable" ? "00:00" : excStart,
        endTime: excType === "unavailable" ? "23:59" : excEnd,
        isAvailable: excType !== "unavailable",
      };
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save exception");
      const json = await res.json();
      setExceptions((prev) => [...prev.filter((e) => e.specificDate?.slice(0, 10) !== excDate), json.data]);
      setExcDate("");
      toast.success("Exception saved");
    } catch {
      toast.error("Failed to save exception");
    } finally {
      setAddingExc(false);
    }
  }, [excDate, excType, excStart, excEnd]);

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

      {/* Date exceptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarOff className="size-4" />
            Date Exceptions
          </CardTitle>
          <CardDescription>
            Override your recurring availability for specific dates (e.g., days off,
            custom hours).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={excDate}
                onChange={(e) => setExcDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={excType}
                onValueChange={(v) => setExcType(v as "unavailable" | "custom")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">Unavailable all day</SelectItem>
                  <SelectItem value="custom">Custom hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {excType === "custom" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="time"
                    value={excStart}
                    onChange={(e) => setExcStart(e.target.value)}
                    className="w-[110px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="time"
                    value={excEnd}
                    onChange={(e) => setExcEnd(e.target.value)}
                    className="w-[110px]"
                  />
                </div>
              </>
            )}
            <Button
              size="sm"
              onClick={handleAddException}
              disabled={addingExc || !excDate}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>

          {/* Existing exceptions */}
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No date exceptions set.
            </p>
          ) : (
            <div className="space-y-2">
              {exceptions
                .sort(
                  (a, b) =>
                    new Date(a.specificDate).getTime() -
                    new Date(b.specificDate).getTime()
                )
                .map((exc) => (
                  <div
                    key={exc.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(exc.specificDate), "EEE, MMM d yyyy")}
                      </span>
                      <Badge
                        variant={exc.isAvailable ? "outline" : "destructive"}
                        className="text-[10px]"
                      >
                        {exc.isAvailable
                          ? `${exc.startTime} – ${exc.endTime}`
                          : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
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

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Clock, CalendarDays, Plus, CalendarOff } from "lucide-react";

interface AvailabilityRecord {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function StaffAvailabilityPage() {
  const queryClient = useQueryClient();

  const [excDate, setExcDate] = useState("");
  const [excType, setExcType] = useState<"unavailable" | "custom">("unavailable");
  const [excStart, setExcStart] = useState("09:00");
  const [excEnd, setExcEnd] = useState("17:00");

  const { data: records = [], isLoading: loading, error } = useQuery<AvailabilityRecord[]>({
    queryKey: ["staff-availability"],
    queryFn: async () => {
      const res = await fetch("/api/availability");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load availability");
      }

      return json.data ?? json.availability ?? [];
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      toast.error(error.message);
    }
  }, [error]);

  const availability = useMemo<AvailabilitySlot[]>(
    () =>
      records
        .filter((a) => a.dayOfWeek !== null)
        .map((a) => ({
          id: a.id,
          dayOfWeek: a.dayOfWeek as number,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: a.isAvailable,
        })),
    [records]
  );

  const exceptions = useMemo(
    () => records.filter((a) => a.specificDate !== null),
    [records]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save availability");
      }

      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability"] });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to save availability";
      toast.error(message);
    },
  });

  const handleToggle = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isAvailable: boolean
  ) => {
    await saveMutation.mutateAsync({ dayOfWeek, startTime, endTime, isAvailable });
  };

  const handleAddException = async () => {
    if (!excDate) {
      toast.error("Select a date");
      return;
    }

    const payload = {
      specificDate: new Date(excDate).toISOString(),
      startTime: excType === "unavailable" ? "00:00" : excStart,
      endTime: excType === "unavailable" ? "23:59" : excEnd,
      isAvailable: excType !== "unavailable",
    };

    try {
      await saveMutation.mutateAsync(payload);
      setExcDate("");
      toast.success("Exception saved");
    } catch {
      // handled by mutation onError
    }
  };

  const totalSlots = 35;
  const unavailableCount = availability.filter((a) => !a.isAvailable).length;
  const saving = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          My Availability
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set recurring weekly availability so managers can schedule you for shifts you can work.
        </p>
      </div>

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
            <p className="text-2xl font-bold">{loading ? "–" : unavailableCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Availability</CardTitle>
          <CardDescription>
            Click any cell to toggle your availability. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AvailabilityGridSkeleton />
          ) : (
            <AvailabilityGrid availability={availability} onToggle={handleToggle} saving={saving} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarOff className="size-4" />
            Date Exceptions
          </CardTitle>
          <CardDescription>
            Override recurring availability for specific dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={excDate}
                onChange={(e) => setExcDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={excType}
                onValueChange={(v) => setExcType(v as "unavailable" | "custom")}
              >
                <SelectTrigger className="w-37.5">
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
                    className="w-27.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="time"
                    value={excEnd}
                    onChange={(e) => setExcEnd(e.target.value)}
                    className="w-27.5"
                  />
                </div>
              </>
            )}
            <Button size="sm" onClick={handleAddException} disabled={saving || !excDate}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>

          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No date exceptions set.
            </p>
          ) : (
            <div className="space-y-2">
              {exceptions
                .sort(
                  (a, b) =>
                    new Date(a.specificDate as string).getTime() -
                    new Date(b.specificDate as string).getTime()
                )
                .map((exc) => (
                  <div
                    key={exc.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(exc.specificDate as string), "EEE, MMM d yyyy")}
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

function AvailabilityGridSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5">
        <div />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted/40 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5">
          <div className="h-10 rounded bg-muted/30 animate-pulse" />
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} className="h-10 rounded bg-muted/30 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

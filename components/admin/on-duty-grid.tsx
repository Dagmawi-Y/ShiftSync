"use client";

import { useActiveShifts } from "@/lib/hooks/useActiveShifts";
import { Badge } from "@/components/ui/badge";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { MapPin, Users, Clock } from "lucide-react";
import type { ManagedLocation } from "@/lib/dashboard-context";

// ─── Types ───────────────────────────────────────────────

interface OnDutyGridProps {
  locations: ManagedLocation[];
}

// ─── Component ───────────────────────────────────────────

export function OnDutyGrid({ locations }: OnDutyGridProps) {
  return (
    <div className="space-y-4">
      {locations.map((location) => (
        <LocationOnDuty key={location.id} location={location} />
      ))}
    </div>
  );
}

// ─── Per-Location Card ───────────────────────────────────

function LocationOnDuty({ location }: { location: ManagedLocation }) {
  const { data, loading, error } = useActiveShifts(location.id);

  const shifts = data?.shifts ?? [];
  const staffCount = shifts.reduce(
    (sum, s) => sum + s.assignments.length,
    0
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Location header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{location.name}</h3>
          <span className="text-[10px] text-muted-foreground">
            {location.timezone}
          </span>
        </div>
        <Badge variant={staffCount > 0 ? "default" : "secondary"} className="text-[10px]">
          <Users className="size-2.5 mr-1" />
          {loading ? "–" : staffCount} on duty
        </Badge>
      </div>

      {/* Shift rows */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-destructive py-2">{error}</p>
      ) : shifts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No active shifts right now
        </p>
      ) : (
        <div className="space-y-1.5">
          {shifts.map((shift) => {
            const colors = getSkillColor(shift.requiredSkill);
            return (
              <div
                key={shift.id}
                className="flex items-center gap-3 rounded-md bg-muted/20 px-3 py-2"
              >
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {formatSkillLabel(shift.requiredSkill)}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="size-2.5" />
                  {format(new Date(shift.startTime), "h:mm a")} –{" "}
                  {format(new Date(shift.endTime), "h:mm a")}
                </div>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0">
                  {shift.assignments.map((a) => (
                    <span
                      key={a.profile.id}
                      className="text-xs bg-background border rounded-full px-2 py-0.5 truncate max-w-28"
                      title={a.profile.name}
                    >
                      {a.profile.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────

export function OnDutyGridSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-4 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-10 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

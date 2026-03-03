"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LocationDialog,
  type LocationFormData,
} from "@/components/admin/location-dialog";
import {
  MapPin,
  Clock,
  Users,
  Shield,
  CalendarDays,
  Trash2,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  timezone: string;
  createdAt: string;
  managers: { id: string; name: string; email: string }[];
  certifiedStaffCount: number;
  totalShifts: number;
}

interface LocationCardGridProps {
  locations: LocationRecord[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string, name: string) => void;
  deleting: string | null;
}

// ─── Skeleton ────────────────────────────────────────────

function LocationCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────

export function LocationCardGrid({
  locations,
  loading,
  onRefresh,
  onDelete,
  deleting,
}: LocationCardGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <LocationCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No locations yet. Add your first location to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((loc) => {
        const editData: LocationFormData = {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          timezone: loc.timezone,
        };

        return (
          <Card key={loc.id} className="relative group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">
                    {loc.name}
                  </CardTitle>
                  <CardDescription className="truncate mt-0.5">
                    {loc.address}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <LocationDialog
                    mode="edit"
                    initial={editData}
                    onSaved={onRefresh}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(loc.id, loc.name)}
                    disabled={deleting === loc.id}
                  >
                    {deleting === loc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {loc.timezone.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {loc.managers.length === 0
                    ? "No managers"
                    : loc.managers.map((m) => m.name).join(", ")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {loc.certifiedStaffCount} certified staff
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{loc.totalShifts} total shifts</span>
              </div>

              {loc.managers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {loc.managers.map((m) => (
                    <Badge key={m.id} variant="secondary" className="text-xs">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

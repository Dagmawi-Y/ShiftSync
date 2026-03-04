"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { Hand, Loader2, MapPin } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface DropShift {
  id: string;
  shiftId: string;
  initiator: { id: string; name: string };
  initiatorNote: string | null;
  createdAt: string;
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    requiredSkill: string;
    location: { name: string };
  };
}

interface AvailableShiftsProps {
  profileId: string;
  onPickedUp?: () => void;
}

// ─── Component ───────────────────────────────────────────

export function AvailableShifts({ profileId, onPickedUp }: AvailableShiftsProps) {
  const queryClient = useQueryClient();

  const {
    data: drops = [],
    isLoading: loading,
    error,
  } = useQuery<DropShift[]>({
    queryKey: ["available-drops", profileId],
    queryFn: async () => {
      const res = await fetch("/api/swaps?status=PENDING_MANAGER&scope=available-drops");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load available shifts");
      }

      const swaps = data.swaps ?? data.data ?? data ?? [];
      if (!Array.isArray(swaps)) {
        throw new Error("Unexpected swaps response");
      }

      return swaps.filter(
        (s: DropShift & { isDrop: boolean }) => s.isDrop && s.initiator.id !== profileId
      );
    },
  });

  useEffect(() => {
    if (error instanceof Error) {
      toast.error(error.message);
    }
  }, [error]);

  const pickupMutation = useMutation({
    mutationFn: async (swapId: string) => {
      const res = await fetch(`/api/swaps/${swapId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to pick up shift");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("You've volunteered for this shift — waiting for manager approval.");
      queryClient.invalidateQueries({ queryKey: ["available-drops", profileId] });
      queryClient.invalidateQueries({ queryKey: ["staff-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["manager-swaps"] });
      onPickedUp?.();
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Could not pick up shift";
      toast.error(message);
    },
  });

  async function handlePickUp(swap: DropShift) {
    await pickupMutation.mutateAsync(swap.id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Hand className="size-4" />
          Available Shifts
        </CardTitle>
        <CardDescription>
          Browse shifts dropped by colleagues. Pick one up to fill the gap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : drops.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No shifts available for pickup right now.
          </p>
        ) : (
          <div className="space-y-2">
            {drops.map((drop) => {
              const colors = getSkillColor(drop.shift.requiredSkill);
              const isPickingThis =
                pickupMutation.isPending && pickupMutation.variables === drop.id;

              return (
                <div
                  key={drop.id}
                  className="group p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${colors.bg} ${colors.text}`}
                      >
                        {formatSkillLabel(drop.shift.requiredSkill)}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-2.5" />
                        {drop.shift.location.name}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {format(new Date(drop.shift.startTime), "EEE, MMM d")} ·{" "}
                      {format(new Date(drop.shift.startTime), "h:mm a")} –{" "}
                      {format(new Date(drop.shift.endTime), "h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dropped by {drop.initiator.name}
                      {drop.initiatorNote && (
                        <span className="italic ml-1">
                          — &ldquo;{drop.initiatorNote}&rdquo;
                        </span>
                      )}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handlePickUp(drop)}
                    disabled={pickupMutation.isPending}
                  >
                    {isPickingThis ? (
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Hand className="size-3.5 mr-1.5" />
                    )}
                    Pick Up
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

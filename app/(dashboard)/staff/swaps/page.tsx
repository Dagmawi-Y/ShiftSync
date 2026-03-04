"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { SwapRequestForm } from "@/components/staff/swap-request-form";
import { DropRequestDialog } from "@/components/staff/drop-request-dialog";
import { MyRequestsList } from "@/components/staff/my-requests-list";
import { AvailableShifts } from "@/components/staff/available-shifts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/hooks/useRealtimeSubscription";

interface ShiftForDrop {
  id: string;
  startTime: string;
  endTime: string;
  requiredSkill: string;
  location: { name: string };
  assignments: { profileId: string; profile: { id: string; name: string } }[];
}

export default function StaffSwapsPage() {
  const { profile } = useDashboard();
  const profileId = profile.id;
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery<any[]>({
    queryKey: ["staff-swaps", profileId],
    queryFn: async () => {
      const res = await fetch("/api/swaps");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load swap requests");
      }

      return data.swaps ?? data.data ?? data ?? [];
    },
  });

  useEffect(() => {
    if (requestsError instanceof Error) {
      toast.error(requestsError.message);
    }
  }, [requestsError]);

  // Real-time: auto-refresh when any SwapRequest changes
  useRealtimeSubscription({
    table: "SwapRequest",
    event: "*",
    onchange: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-swaps", profileId] });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-swaps", profileId] });
    queryClient.invalidateQueries({ queryKey: ["staff-drop-shifts", profileId] });
  };

  // ── Drop dialog ────────────────────────────────────────
  const [dropShift, setDropShift] = useState<ShiftForDrop | null>(null);
  const [dropDialogOpen, setDropDialogOpen] = useState(false);

  const { data: myShifts = [], isLoading: shiftsLoading } = useQuery<ShiftForDrop[]>({
    queryKey: ["staff-drop-shifts", profileId],
    queryFn: async () => {
      const now = new Date();
      const weekStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();

      const res = await fetch(`/api/shifts?weekStart=${weekStart}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load shifts");
      }

      const allShifts = data.shifts ?? data.data ?? data ?? [];
      const assigned = allShifts.filter((s: ShiftForDrop) =>
        s.assignments?.some((a) => a.profileId === profileId)
      );
      const cutoff = Date.now() + 24 * 60 * 60 * 1000;

      return assigned.filter(
        (s: ShiftForDrop) => new Date(s.startTime).getTime() > cutoff
      );
    },
  });

  function openDrop(shift: ShiftForDrop) {
    setDropShift(shift);
    setDropDialogOpen(true);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Swaps & Drops
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Swap shifts with colleagues or drop shifts you can&apos;t work.
        </p>
      </div>

      {/* Quick drop buttons */}
      {!shiftsLoading && myShifts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Quick Drop</h3>
          <div className="flex flex-wrap gap-2">
            {myShifts.slice(0, 6).map((shift) => {
              const colors = getSkillColor(shift.requiredSkill);
              return (
                <Button
                  key={shift.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 px-3"
                  onClick={() => openDrop(shift)}
                >
                  <ArrowDown className="size-3 mr-1.5 text-amber-500" />
                  <Badge
                    variant="secondary"
                    className={`text-[10px] mr-1.5 ${colors.bg} ${colors.text}`}
                  >
                    {formatSkillLabel(shift.requiredSkill)}
                  </Badge>
                  {format(new Date(shift.startTime), "EEE M/d h:mma")}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column — swap form + available shifts */}
        <div className="space-y-6">
          <SwapRequestForm
            profileId={profileId}
            onSubmitted={handleRefresh}
          />
          <AvailableShifts
            profileId={profileId}
            onPickedUp={handleRefresh}
          />
        </div>

        {/* Right column — my requests */}
        <div>
          <MyRequestsList
            requests={requests}
            profileId={profileId}
            loading={requestsLoading}
            onAction={handleRefresh}
          />
        </div>
      </div>

      {/* Drop dialog */}
      <DropRequestDialog
        shift={dropShift}
        open={dropDialogOpen}
        onOpenChange={setDropDialogOpen}
        onSubmitted={handleRefresh}
      />
    </div>
  );
}

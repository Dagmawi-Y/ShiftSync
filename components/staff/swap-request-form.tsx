"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { ArrowRightLeft, Loader2, Send, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface ShiftForSwap {
  id: string;
  startTime: string;
  endTime: string;
  requiredSkill: string;
  location: { id: string; name: string };
  assignments: { profileId: string; profile: { id: string; name: string } }[];
}

interface StaffMember {
  id: string;
  name: string;
  skills: { skill: string }[];
}

interface SwapRequestFormProps {
  profileId: string;
  onSubmitted?: () => void;
}

// ─── Component ───────────────────────────────────────────

export function SwapRequestForm({ profileId, onSubmitted }: SwapRequestFormProps) {
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState<ShiftForSwap | null>(null);
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const {
    data: shifts = [],
    isLoading: loading,
    error: shiftsError,
  } = useQuery<ShiftForSwap[]>({
    queryKey: ["staff-eligible-shifts", profileId],
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
        throw new Error(data.error ?? "Failed to load your shifts");
      }

      const allShifts = data.shifts ?? data.data ?? data ?? [];
      if (!Array.isArray(allShifts)) {
        throw new Error("Unexpected shifts response");
      }

      const myShifts = allShifts.filter(
        (s: ShiftForSwap) => s.assignments?.some((a) => a.profileId === profileId)
      );
      const cutoff = Date.now() + 24 * 60 * 60 * 1000;

      return myShifts.filter(
        (s: ShiftForSwap) => new Date(s.startTime).getTime() > cutoff
      );
    },
  });

  const {
    data: colleagues = [],
    isLoading: loadingColleagues,
    error: colleaguesError,
  } = useQuery<StaffMember[]>({
    queryKey: [
      "swap-colleagues",
      profileId,
      selectedShift?.location.id ?? "none",
      selectedShift?.requiredSkill ?? "none",
    ],
    enabled: Boolean(selectedShift),
    queryFn: async () => {
      const params = new URLSearchParams({
        skill: selectedShift!.requiredSkill,
        locationId: selectedShift!.location.id,
      });
      const res = await fetch(`/api/staff?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load colleagues");
      }

      const staff = data.staff ?? data.data ?? data ?? [];
      if (!Array.isArray(staff)) {
        throw new Error("Unexpected staff response");
      }

      return staff.filter((s: StaffMember) => s.id !== profileId);
    },
  });

  useEffect(() => {
    if (shiftsError instanceof Error) {
      toast.error(shiftsError.message);
    }
  }, [shiftsError]);

  useEffect(() => {
    if (colleaguesError instanceof Error) {
      toast.error(colleaguesError.message);
    }
  }, [colleaguesError]);

  useEffect(() => {
    setSelectedColleague(null);
  }, [selectedShift]);

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      shiftId: string;
      receiverId: string;
      initiatorNote?: string;
    }) => {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit swap request");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Swap request sent!");
      setSelectedShift(null);
      setSelectedColleague(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["staff-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["manager-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["staff-eligible-shifts", profileId] });
      queryClient.invalidateQueries({ queryKey: ["staff-drop-shifts", profileId] });
      onSubmitted?.();
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to submit swap request";
      toast.error(message);
    },
  });

  const canSubmit = useMemo(
    () => Boolean(selectedShift && selectedColleague && !submitMutation.isPending),
    [selectedShift, selectedColleague, submitMutation.isPending]
  );

  // ── Submit swap request ───────────────────────────────
  async function handleSubmit() {
    if (!selectedShift || !selectedColleague) return;
    await submitMutation.mutateAsync({
      shiftId: selectedShift.id,
      receiverId: selectedColleague,
      initiatorNote: note || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="size-4" />
          Request a Swap
        </CardTitle>
        <CardDescription>
          Select one of your upcoming shifts and choose a qualified colleague
          to swap with.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1 — pick shift */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            1. Select a shift
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Loading shifts…
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No eligible shifts to swap (must be &gt;24 hrs away).
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {shifts.map((shift) => {
                const colors = getSkillColor(shift.requiredSkill);
                const isSelected = selectedShift?.id === shift.id;
                return (
                  <button
                    key={shift.id}
                    onClick={() =>
                      setSelectedShift(isSelected ? null : shift)
                    }
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${colors.bg} ${colors.text}`}
                      >
                        {formatSkillLabel(shift.requiredSkill)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {shift.location.name}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {format(new Date(shift.startTime), "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(shift.startTime), "h:mm a")} –{" "}
                      {format(new Date(shift.endTime), "h:mm a")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2 — pick colleague */}
        {selectedShift && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              2. Choose a colleague
            </label>
            {loadingColleagues ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin" /> Finding qualified
                staff…
              </div>
            ) : colleagues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No qualified colleagues found for this shift.
              </p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {colleagues.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedColleague(
                        selectedColleague === c.id ? null : c.id
                      )
                    }
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                      selectedColleague === c.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                      <User className="size-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.skills.map((s) => formatSkillLabel(s.skill)).join(", ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — optional note + submit */}
        {selectedShift && selectedColleague && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                3. Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="e.g. I have a doctor's appointment…"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              Send Swap Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
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
  location: { name: string };
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
  const [shifts, setShifts] = useState<ShiftForSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ShiftForSwap | null>(null);
  const [colleagues, setColleagues] = useState<StaffMember[]>([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch user's upcoming assigned shifts ────────────
  useEffect(() => {
    async function fetchShifts() {
      try {
        const now = new Date();
        const weekStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).toISOString();
        const res = await fetch(`/api/shifts?weekStart=${weekStart}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Filter to only shifts where the current user is assigned
        const myShifts = (data.shifts ?? data ?? []).filter(
          (s: ShiftForSwap) =>
            s.assignments?.some((a) => a.profileId === profileId)
        );
        // Only future shifts (> 24hr from now)
        const cutoff = Date.now() + 24 * 60 * 60 * 1000;
        const eligible = myShifts.filter(
          (s: ShiftForSwap) => new Date(s.startTime).getTime() > cutoff
        );
        setShifts(eligible);
      } catch {
        toast.error("Failed to load your shifts");
      } finally {
        setLoading(false);
      }
    }
    fetchShifts();
  }, [profileId]);

  // ── When a shift is selected, fetch qualified colleagues ──
  useEffect(() => {
    if (!selectedShift) {
      setColleagues([]);
      setSelectedColleague(null);
      return;
    }

    async function fetchColleagues() {
      setLoadingColleagues(true);
      try {
        const skill = selectedShift!.requiredSkill;
        const res = await fetch(`/api/staff?skill=${skill}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Exclude self
        const others = (data.staff ?? data ?? []).filter(
          (s: StaffMember) => s.id !== profileId
        );
        setColleagues(others);
      } catch {
        toast.error("Failed to load colleagues");
      } finally {
        setLoadingColleagues(false);
      }
    }
    fetchColleagues();
  }, [selectedShift, profileId]);

  // ── Submit swap request ───────────────────────────────
  async function handleSubmit() {
    if (!selectedShift || !selectedColleague) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: selectedShift.id,
          receiverId: selectedColleague,
          initiatorNote: note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit swap request");
      }

      toast.success("Swap request sent!");
      setSelectedShift(null);
      setSelectedColleague(null);
      setNote("");
      onSubmitted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit swap request"
      );
    } finally {
      setSubmitting(false);
    }
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
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
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

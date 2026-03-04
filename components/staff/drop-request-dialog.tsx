"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSkillColor, formatSkillLabel } from "@/components/schedule/shift-card";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface ShiftForDrop {
  id: string;
  startTime: string;
  endTime: string;
  requiredSkill: string;
  location: { name: string };
}

interface DropRequestDialogProps {
  shift: ShiftForDrop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

// ─── Component ───────────────────────────────────────────

export function DropRequestDialog({
  shift,
  open,
  onOpenChange,
  onSubmitted,
}: DropRequestDialogProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (payload: { shiftId: string; initiatorNote?: string }) => {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit drop request");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Drop request submitted — managers will be notified.");
      setNote("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["staff-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["manager-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["available-drops"] });
      onSubmitted?.();
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to submit drop request";
      toast.error(message);
    },
  });

  async function handleDrop() {
    if (!shift) return;
    await submitMutation.mutateAsync({
      shiftId: shift.id,
      initiatorNote: note || undefined,
    });
  }

  if (!shift) return null;

  const colors = getSkillColor(shift.requiredSkill);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Drop Shift
          </DialogTitle>
          <DialogDescription>
            This will notify managers that you need this shift covered. Another
            staff member can pick it up.
          </DialogDescription>
        </DialogHeader>

        {/* Shift card preview */}
        <div className="p-3 rounded-lg border bg-muted/30">
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
            {format(new Date(shift.startTime), "EEEE, MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(shift.startTime), "h:mm a")} –{" "}
            {format(new Date(shift.endTime), "h:mm a")}
          </p>
        </div>

        {/* Optional note */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Reason (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Why do you need to drop this shift?"
            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Actions */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDrop}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending && (
              <Loader2 className="size-4 animate-spin mr-2" />
            )}
            Drop Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

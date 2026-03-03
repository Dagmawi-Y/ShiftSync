"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────

const SKILLS = [
  { value: "BARTENDER", label: "Bartender" },
  { value: "LINE_COOK", label: "Line Cook" },
  { value: "SERVER", label: "Server" },
  { value: "HOST", label: "Host" },
] as const;

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  /** Pre-filled date when user clicks "+" on a day column */
  defaultDate?: Date;
  onCreated: () => void;
}

// ─── Component ───────────────────────────────────────────

export function CreateShiftDialog({
  open,
  onOpenChange,
  locationId,
  defaultDate,
  onCreated,
}: CreateShiftDialogProps) {
  const [loading, setLoading] = useState(false);
  const [skill, setSkill] = useState<string>("SERVER");
  const [headcount, setHeadcount] = useState("1");
  const [date, setDate] = useState(
    defaultDate ? format(defaultDate, "yyyy-MM-dd") : ""
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Reset form when dialog opens with a new date
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && defaultDate) {
      setDate(format(defaultDate, "yyyy-MM-dd"));
      setSkill("SERVER");
      setHeadcount("1");
      setStartTime("09:00");
      setEndTime("17:00");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;

    setLoading(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();

      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          requiredSkill: skill,
          headcount: parseInt(headcount, 10),
          startTime: startISO,
          endTime: endISO,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Shift created");
        onCreated();
        onOpenChange(false);
      } else {
        toast.error(json.error || "Failed to create shift");
      }
    } catch {
      toast.error("Failed to create shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">Create Shift</DialogTitle>
          <DialogDescription>
            Add a new shift to the schedule. Staff can be assigned after
            creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Skill */}
          <div className="space-y-2">
            <Label>Required Skill</Label>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Headcount */}
          <div className="space-y-2">
            <Label>Headcount</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

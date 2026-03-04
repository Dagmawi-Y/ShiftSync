"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil } from "lucide-react";

// ─── Common timezones ────────────────────────────────────

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Indiana/Indianapolis",
  "America/Detroit",
  "America/Boise",
  "US/Eastern",
  "US/Central",
  "US/Mountain",
  "US/Pacific",
] as const;

// ─── Types ───────────────────────────────────────────────

export interface LocationFormData {
  id?: string;
  name: string;
  address: string;
  timezone: string;
}

interface LocationDialogProps {
  mode: "create" | "edit";
  initial?: LocationFormData;
  onSaved?: () => void;
}

// ─── Component ───────────────────────────────────────────

export function LocationDialog({ mode, initial, onSaved }: LocationDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "America/New_York");

  function resetForm() {
    setName(initial?.name ?? "");
    setAddress(initial?.address ?? "");
    setTimezone(initial?.timezone ?? "America/New_York");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !timezone) return;

    const payload: Record<string, string> = { name, address, timezone };
    if (mode === "edit" && initial?.id) payload.id = initial.id;

    await locationMutation.mutateAsync(payload);
  }

  const locationMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch("/api/locations", {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Request failed");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success(
        mode === "create" ? "Location created" : "Location updated"
      );
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      onSaved?.();
    },
    onError: (mutationError: unknown) => {
      const msg =
        mutationError instanceof Error ? mutationError.message : "Something went wrong";
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Location
          </Button>
        ) : (
          <Button variant="ghost" size="icon-xs">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Location" : "Edit Location"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new restaurant location."
              : `Update ${initial?.name ?? "location"} details.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              placeholder="e.g. Downtown Main"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-address">Address</Label>
            <Input
              id="loc-address"
              placeholder="123 Ocean Blvd, Miami, FL"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-tz">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="loc-tz">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={locationMutation.isPending}>
              {locationMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

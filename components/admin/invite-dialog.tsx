"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ManagedLocation } from "@/lib/dashboard-context";
import { Loader2, UserPlus } from "lucide-react";

const SKILLS = ["BARTENDER", "LINE_COOK", "SERVER", "HOST"] as const;
const ROLES = ["STAFF", "MANAGER"] as const;

interface InviteDialogProps {
  locations: ManagedLocation[];
  onInvited?: () => void;
}

export function InviteDialog({ locations, onInvited }: InviteDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("STAFF");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [desiredHours, setDesiredHours] = useState("");

  function resetForm() {
    setEmail("");
    setName("");
    setRole("STAFF");
    setSelectedSkills([]);
    setSelectedLocations([]);
    setDesiredHours("");
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function toggleLocation(id: string) {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  const inviteMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      name: string;
      role: (typeof ROLES)[number];
      skills?: string[];
      locationIds?: string[];
      desiredHours?: number;
    }) => {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send invite");
      }

      return payload;
    },
    onSuccess: (payload) => {
      toast.success(`Invite sent to ${payload.email}`);
      resetForm();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onInvited?.();
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to send invite";
      toast.error(message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name) return;

    await inviteMutation.mutateAsync({
      email,
      name,
      role,
      skills: role === "STAFF" ? selectedSkills : undefined,
      locationIds: selectedLocations.length > 0 ? selectedLocations : undefined,
      desiredHours: desiredHours ? parseInt(desiredHours, 10) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite a New User</DialogTitle>
            <DialogDescription>
              Send an email invitation. They&apos;ll set their password on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@coastaleats.com"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Role</Label>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={role === r ? "default" : "outline"}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            {role === "STAFF" && (
              <div className="grid gap-1.5">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <Badge
                        key={skill}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill.replace(/_/g, " ")}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {locations.length > 0 && (
              <div className="grid gap-1.5">
                <Label>{role === "STAFF" ? "Certify at" : "Manage"} Locations</Label>
                <div className="space-y-2">
                  {locations.map((loc) => (
                    <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedLocations.includes(loc.id)}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <span className="text-sm">{loc.name}</span>
                      <span className="text-[10px] text-muted-foreground">{loc.timezone}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {role === "STAFF" && (
              <div className="grid gap-1.5">
                <Label htmlFor="invite-hours">Desired Weekly Hours (optional)</Label>
                <Input
                  id="invite-hours"
                  type="number"
                  min="1"
                  max="60"
                  value={desiredHours}
                  onChange={(e) => setDesiredHours(e.target.value)}
                  placeholder="e.g. 32"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={inviteMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending || !email || !name}>
              {inviteMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

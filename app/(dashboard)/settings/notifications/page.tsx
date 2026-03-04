"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Prefs {
  inApp: boolean;
  email: boolean;
  shiftAssigned: boolean;
  shiftChanged: boolean;
  schedulePublished: boolean;
  swapUpdates: boolean;
  overtimeWarnings: boolean;
}

const DEFAULT_PREFS: Prefs = {
  inApp: true,
  email: false,
  shiftAssigned: true,
  shiftChanged: true,
  schedulePublished: true,
  swapUpdates: true,
  overtimeWarnings: true,
};

const CATEGORIES: { key: keyof Prefs; label: string; description: string }[] = [
  {
    key: "shiftAssigned",
    label: "Shift Assigned",
    description: "When you are assigned to a new shift.",
  },
  {
    key: "shiftChanged",
    label: "Shift Changes",
    description: "When a shift you're part of is modified or cancelled.",
  },
  {
    key: "schedulePublished",
    label: "Schedule Published",
    description: "When the weekly schedule is published.",
  },
  {
    key: "swapUpdates",
    label: "Swap & Drop Updates",
    description: "Swap requests, approvals, rejections, and drop notifications.",
  },
  {
    key: "overtimeWarnings",
    label: "Overtime Warnings",
    description: "Alerts when approaching or exceeding overtime limits.",
  },
];

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  const { data, isLoading: loading } = useQuery<Prefs>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/notification-preferences");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load preferences");
      }

      return json.data ?? DEFAULT_PREFS;
    },
    initialData: DEFAULT_PREFS,
  });

  useEffect(() => {
    if (data) {
      setPrefs(data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof Prefs; value: boolean }) => {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        throw new Error("Failed to save preference");
      }
      return { key, value };
    },
    onError: (_error, variables) => {
      setPrefs((prev) => ({ ...prev, [variables.key]: !variables.value }));
      toast.error("Failed to save preference");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const updatePref = (key: keyof Prefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    updateMutation.mutate({ key, value });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Notification Preferences
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose how and when you want to be notified.
        </p>
      </div>

      {/* Delivery channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Channels</CardTitle>
          <CardDescription>
            Select where you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="size-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">In-App</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications appear in the bell menu.
                </p>
              </div>
            </div>
            <Checkbox
              checked={prefs.inApp}
              onCheckedChange={(v) => updatePref("inApp", !!v)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-xs text-muted-foreground">
                  Receive a copy via email (simulated).
                </p>
              </div>
            </div>
            <Checkbox
              checked={prefs.email}
              onCheckedChange={(v) => updatePref("email", !!v)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
          <CardDescription>
            Enable or disable specific notification types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center justify-between"
            >
              <div>
                <Label className="text-sm font-medium">{cat.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {cat.description}
                </p>
              </div>
              <Checkbox
                checked={prefs[cat.key] as boolean}
                onCheckedChange={(v) => updatePref(cat.key, !!v)}
                disabled={loading || !prefs.inApp}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {updateMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}

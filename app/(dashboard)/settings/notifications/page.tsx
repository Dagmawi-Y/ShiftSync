"use client";

import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

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
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notification-preferences");
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.data) setPrefs(json.data);
      } catch {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updatePref = useCallback(
    async (key: keyof Prefs, value: boolean) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      setSaving(true);
      try {
        const res = await fetch("/api/notification-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Rollback
        setPrefs(prefs);
        toast.error("Failed to save preference");
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

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

      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}

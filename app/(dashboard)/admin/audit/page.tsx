"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
} from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditTable, type AuditEntry } from "@/components/admin/audit-table";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { toast } from "sonner";

export default function AdminAuditPage() {
  const { selectedLocationId } = useDashboard();
  const [weekOffset, setWeekOffset] = useState(0);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });
  const weekEnd = endOfWeek(subWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      });
      if (selectedLocationId) {
        params.set("locationId", selectedLocationId);
      }

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setLogs(json.data ?? []);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString(), selectedLocationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // CSV export
  function handleExportCsv() {
    if (logs.length === 0) return;

    const headers = ["Time", "Action", "Actor", "Role", "Location", "Before", "After"];
    const rows = logs.map((l) => [
      format(new Date(l.createdAt), "yyyy-MM-dd HH:mm:ss"),
      l.action,
      l.actor.name,
      l.actor.role,
      l.shift?.location.name ?? "",
      l.before ? JSON.stringify(l.before) : "",
      l.after ? JSON.stringify(l.after) : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(weekStart, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every action taken across the platform, with before/after diffs.
          </p>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Audit table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4" />
            Activity Trail
          </CardTitle>
          <CardDescription>
            Click the arrow to expand any entry and see the before/after data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditTable
            logs={logs}
            loading={loading}
            onExportCsv={handleExportCsv}
          />
        </CardContent>
      </Card>
    </div>
  );
}

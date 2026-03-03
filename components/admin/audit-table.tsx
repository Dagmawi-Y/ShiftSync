"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  shiftId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; role: string };
  shift: {
    id: string;
    location: { id: string; name: string };
  } | null;
}

interface AuditTableProps {
  logs: AuditEntry[];
  loading?: boolean;
  onExportCsv?: () => void;
}

// ─── Action badge colors ─────────────────────────────────

function actionVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("CREATED") || action.includes("ADDED")) return "default";
  if (action.includes("APPROVED")) return "default";
  if (action.includes("REMOVED") || action.includes("REJECTED") || action.includes("CANCELLED"))
    return "destructive";
  return "secondary";
}

// ─── Component ───────────────────────────────────────────

export function AuditTable({ logs, loading, onExportCsv }: AuditTableProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actor.name.toLowerCase().includes(q) ||
        l.shift?.location.name.toLowerCase().includes(q)
    );
  }, [logs, search]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter by action, actor, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {onExportCsv && (
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {search ? "No matching log entries." : "No audit logs yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasDiff = log.before || log.after;

                return (
                  <TableRow
                    key={log.id}
                    className="group"
                  >
                    {/* Expand toggle */}
                    <TableCell className="w-8 pr-0">
                      {hasDiff ? (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      ) : (
                        <div className="size-5" />
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <Badge
                        variant={actionVariant(log.action)}
                        className="text-[10px] font-mono"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    {/* Actor */}
                    <TableCell>
                      <span className="text-sm">{log.actor.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        {log.actor.role}
                      </span>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {log.shift?.location.name ?? "—"}
                    </TableCell>

                    {/* Time */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(log.createdAt),
                        "MMM d, yyyy h:mm a"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Expanded diff panels rendered outside table for proper layout */}
      {filtered.map((log) => {
        if (expandedId !== log.id || (!log.before && !log.after)) return null;
        return (
          <div
            key={`diff-${log.id}`}
            className="mx-4 -mt-2 mb-2 rounded-lg border bg-muted/20 p-4 text-xs font-mono space-y-3"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {log.before && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-sans font-semibold">
                    Before
                  </p>
                  <pre className="whitespace-pre-wrap break-all bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded p-2 text-red-800 dark:text-red-300">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-sans font-semibold">
                    After
                  </p>
                  <pre className="whitespace-pre-wrap break-all bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded p-2 text-emerald-800 dark:text-emerald-300">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} log entr{filtered.length !== 1 ? "ies" : "y"}
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MapPin,
  Users,
  Star,
  Trash2,
  Loader2,
  ScrollText,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatSkillLabel, getSkillColor, type ShiftData } from "./shift-card";
import { StaffAssignmentRow } from "./staff-assignment-row";
import { useConflictDetection } from "@/lib/hooks/useConflictDetection";
import { formatInTimezone, formatTimeRange } from "@/lib/timezone";

// ─── Types ───────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  skills: { skill: string }[];
  certifications: { locationId: string }[];
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string; role: string };
}

interface ShiftDetailPanelProps {
  shift: ShiftData | null;
  onClose: () => void;
  onDelete: (shiftId: string) => Promise<void>;
  onRefresh: () => void;
}

// ─── Component ───────────────────────────────────────────

export function ShiftDetailPanel({
  shift,
  onClose,
  onDelete,
  onRefresh,
}: ShiftDetailPanelProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Track staff IDs currently visible for conflict detection
  const watchedStaffIds = staff.map((s) => s.id);
  const { conflicts, clearAll: clearConflicts } =
    useConflictDetection(watchedStaffIds);
  const conflictStaffIds = new Set(conflicts.map((c) => c.staffId));

  // Fetch qualified staff when a shift is selected
  const fetchStaff = useCallback(async () => {
    if (!shift) return;
    setLoadingStaff(true);
    try {
      const res = await fetch(
        `/api/staff?locationId=${shift.locationId}&skill=${shift.requiredSkill}`
      );
      const json = await res.json();
      if (json.success) setStaff(json.data);
    } finally {
      setLoadingStaff(false);
    }
  }, [shift?.id, shift?.locationId, shift?.requiredSkill]);

  useEffect(() => {
    if (shift) {
      fetchStaff();
      clearConflicts();
      // Fetch audit logs for this shift
      fetch(`/api/audit?shiftId=${shift.id}`)
        .then((r) => r.json())
        .then((j) => setAuditLogs(j.data ?? []))
        .catch(() => {});
    }
  }, [shift?.id]);

  // Assign handler — calls API, bubbles constraint errors
  const handleAssign = useCallback(
    async (
      staffId: string,
      overrideRules?: string[],
      overrideReason?: string
    ) => {
      if (!shift) return;
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift.id,
          profileId: staffId,
          overrideRules,
          overrideReason,
        }),
      });
      const json = await res.json();
      if (!json.success && json.constraint) {
        throw { constraint: json.constraint };
      }
      // Refresh parent to update shift data
      onRefresh();
    },
    [shift, onRefresh]
  );

  // Preview handler — what-if overtime check
  const handlePreview = useCallback(
    async (staffId: string) => {
      if (!shift) return null;
      try {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shiftId: shift.id,
            profileId: staffId,
            preview: true,
          }),
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch {
        // silently fail preview
      }
      return null;
    },
    [shift]
  );

  const handleDelete = async () => {
    if (!shift) return;
    setDeleting(true);
    try {
      await onDelete(shift.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const assignedIds = new Set(shift?.assignments.map((a) => a.profileId) ?? []);

  return (
    <AnimatePresence>
      {shift && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] max-w-full bg-background border-l border-border shadow-xl flex flex-col"
          >
            <TooltipProvider>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="text-lg font-bold font-display">
                  Shift Details
                </h2>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="size-4" />
                </Button>
              </div>

              {/* Shift info */}
              <div className="px-5 py-4 space-y-3 border-b">
                <ShiftInfoRow shift={shift} />
              </div>

              {/* Staff assignment list */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    Qualified Staff
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {shift.assignments.length}/{shift.headcount} assigned
                  </span>
                </div>

                {loadingStaff ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div className="size-8 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No qualified staff found for this shift.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Show assigned first, then unassigned */}
                    {[...staff]
                      .sort((a, b) => {
                        const aAssigned = assignedIds.has(a.id) ? 0 : 1;
                        const bAssigned = assignedIds.has(b.id) ? 0 : 1;
                        return aAssigned - bAssigned;
                      })
                      .map((s) => (
                        <StaffAssignmentRow
                          key={s.id}
                          staff={s}
                          shiftId={shift.id}
                          isAssigned={assignedIds.has(s.id)}
                          onAssign={handleAssign}
                          onPreview={handlePreview}
                          conflictStaffIds={conflictStaffIds}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Audit / History section */}
              {auditLogs.length > 0 && (
                <div className="px-5 py-3 border-t">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <ScrollText className="size-3.5" />
                    History ({auditLogs.length})
                    <ChevronDown
                      className={cn(
                        "size-3.5 ml-auto transition-transform",
                        showHistory && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2 max-h-40 overflow-y-auto">
                          {auditLogs.map((log) => (
                            <div key={log.id} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {log.actor.name}
                              </span>{" "}
                              {log.action.replace(/_/g, " ").toLowerCase()}{" "}
                              <span className="text-muted-foreground/60">
                                {formatDistanceToNow(new Date(log.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Footer actions */}
              <div className="px-5 py-3 border-t flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Delete Shift
                </Button>
              </div>
            </TooltipProvider>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Shift Info Sub-component ────────────────────────────

function ShiftInfoRow({ shift }: { shift: ShiftData }) {
  const colors = getSkillColor(shift.requiredSkill);
  const tz = shift.location.timezone ?? "UTC";
  const date = formatInTimezone(shift.startTime, tz, "EEEE, MMM d");
  const timeRange = formatTimeRange(shift.startTime, shift.endTime, tz);
  const locationName =
    shift.location.name.split("—")[1]?.trim() ?? shift.location.name;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-xs", colors.text, colors.border)}
        >
          {formatSkillLabel(shift.requiredSkill)}
        </Badge>
        {shift.isPremium && (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 text-[10px]">
            <Star className="size-2.5 fill-current" />
            Premium
          </Badge>
        )}
        {!shift.isPublished && (
          <Badge variant="outline" className="text-[10px] border-dashed">
            Draft
          </Badge>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>
            {date} · {timeRange}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-3.5" />
          <span>{locationName}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-3.5" />
          <span>
            {shift.assignments.length}/{shift.headcount} staff assigned
          </span>
        </div>
      </div>
    </>
  );
}

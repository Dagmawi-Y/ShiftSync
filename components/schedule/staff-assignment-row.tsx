"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSkillLabel } from "./shift-card";
import {
  ConstraintFeedback,
  type ConstraintInfo,
} from "./constraint-feedback";
import { Check, Loader2, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  skills: { skill: string }[];
  certifications: { locationId: string }[];
}

interface StaffAssignmentRowProps {
  staff: StaffMember;
  shiftId: string;
  isAssigned: boolean;
  onAssign: (staffId: string, overrideRules?: string[], overrideReason?: string) => Promise<void>;
  onPreview: (staffId: string) => Promise<{
    projectedWeeklyHours: number;
    isOvertime: boolean;
    hoursUntilOvertime: number;
  } | null>;
  /** Set of staff IDs involved in concurrent conflict */
  conflictStaffIds?: Set<string>;
}

// ─── Component ───────────────────────────────────────────

export function StaffAssignmentRow({
  staff,
  shiftId,
  isAssigned,
  onAssign,
  onPreview,
  conflictStaffIds,
}: StaffAssignmentRowProps) {
  const [loading, setLoading] = useState(false);
  const [optimisticAssigned, setOptimisticAssigned] = useState(false);
  const [constraint, setConstraint] = useState<ConstraintInfo | null>(null);
  const [preview, setPreview] = useState<{
    projectedWeeklyHours: number;
    isOvertime: boolean;
    hoursUntilOvertime: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  const hasConflict = conflictStaffIds?.has(staff.id);
  const showAsAssigned = isAssigned || optimisticAssigned;

  const handleAssign = async () => {
    setLoading(true);
    setConstraint(null);
    // Optimistic: immediately show as assigned
    setOptimisticAssigned(true);
    try {
      await onAssign(staff.id);
    } catch (err: unknown) {
      // Rollback optimistic update on failure
      setOptimisticAssigned(false);
      // If the API returns a constraint violation, show it inline
      if (err && typeof err === "object" && "constraint" in err) {
        setConstraint((err as { constraint: ConstraintInfo }).constraint);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!constraint) return;
    setIsOverriding(true);
    try {
      await onAssign(staff.id, [constraint.rule], "Manager override");
      setConstraint(null);
    } finally {
      setIsOverriding(false);
    }
  };

  const handleHoverPreview = async () => {
    if (preview || showAsAssigned) return;
    const p = await onPreview(staff.id);
    setPreview(p);
    setShowPreview(true);
  };

  const skills = staff.skills.map((s) => formatSkillLabel(s.skill)).join(", ");

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
          showAsAssigned
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : "hover:bg-muted/50",
          hasConflict && "ring-2 ring-amber-400/50"
        )}
        onMouseEnter={handleHoverPreview}
        onMouseLeave={() => setShowPreview(false)}
      >
        {/* Avatar */}
        <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
          {staff.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{staff.name}</span>
            {hasConflict && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="size-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Just assigned by another manager
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{skills}</p>
        </div>

        {/* Preview tooltip on hover */}
        <AnimatePresence>
          {showPreview && preview && !showAsAssigned && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className={cn(
                "flex items-center gap-1 text-[11px] font-medium",
                preview.isOvertime
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Clock className="size-3" />
              {preview.projectedWeeklyHours.toFixed(1)}h
              {preview.isOvertime && " OT"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action */}
        {showAsAssigned ? (
          <motion.div
            initial={optimisticAssigned ? { scale: 0.8, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <Check className="size-4" />
            <span className="text-xs font-medium">
              {optimisticAssigned && loading ? "Assigning…" : "Assigned"}
            </span>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            size="xs"
            onClick={handleAssign}
            disabled={loading || hasConflict}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Assign"
            )}
          </Button>
        )}
      </div>

      {/* Constraint feedback inline */}
      <AnimatePresence>
        {constraint && (
          <div className="ml-11">
            <ConstraintFeedback
              constraint={constraint}
              onOverride={constraint.canOverride ? handleOverride : undefined}
              onSelectSuggestion={(staffId) => {
                setConstraint(null);
                onAssign(staffId);
              }}
              isOverriding={isOverriding}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

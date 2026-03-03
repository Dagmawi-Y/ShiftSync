"use client";

import {
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { ConstraintSeverity, ConstraintRule } from "@/lib/services/constraintEngine";

// ─── Types ───────────────────────────────────────────────

export interface ConstraintInfo {
  valid: false;
  severity: ConstraintSeverity;
  rule: ConstraintRule;
  message: string;
  suggestions: { id: string; name: string; hoursThisWeek: number }[];
  canOverride: boolean;
}

interface ConstraintFeedbackProps {
  constraint: ConstraintInfo;
  onOverride?: () => void;
  onSelectSuggestion?: (staffId: string) => void;
  isOverriding?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function ConstraintFeedback({
  constraint,
  onOverride,
  onSelectSuggestion,
  isOverriding,
}: ConstraintFeedbackProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isBlock = constraint.severity === "BLOCK";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border p-3 text-sm",
        isBlock
          ? "bg-destructive/5 border-destructive/20 text-destructive"
          : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
      )}
    >
      <div className="flex items-start gap-2">
        {isBlock ? (
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">{constraint.message}</p>

          {/* Override button for warnings */}
          {constraint.canOverride && onOverride && (
            <Button
              variant="outline"
              size="xs"
              className="mt-2 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              onClick={onOverride}
              disabled={isOverriding}
            >
              {isOverriding ? "Overriding…" : "Override & Assign Anyway"}
            </Button>
          )}

          {/* Alternative suggestions */}
          {constraint.suggestions.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-1 text-[12px] font-medium hover:underline"
              >
                <Lightbulb className="size-3" />
                {showSuggestions ? "Hide" : "Show"} suggestions
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform",
                    showSuggestions && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1.5 space-y-1"
                  >
                    {constraint.suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onSelectSuggestion?.(s.id)}
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[12px] bg-background/80 hover:bg-background border transition-colors"
                      >
                        <UserCheck className="size-3 text-emerald-500" />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground ml-auto">
                          {s.hoursThisWeek}h this week
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

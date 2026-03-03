"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { ShiftData } from "./shift-card";

// ─── Types ───────────────────────────────────────────────

interface PublishBarProps {
  shifts: ShiftData[];
  onPublished: () => void;
}

// ─── Component ───────────────────────────────────────────

export function PublishBar({ shifts, onPublished }: PublishBarProps) {
  const [publishing, setPublishing] = useState(false);

  const draftShifts = shifts.filter((s) => !s.isPublished);
  const publishedShifts = shifts.filter((s) => s.isPublished);

  // Count understaffed drafts (not enough assignments)
  const understaffedDrafts = draftShifts.filter(
    (s) => s.assignments.length < s.headcount
  );

  if (draftShifts.length === 0 && publishedShifts.length === 0) return null;

  const handlePublishAll = async () => {
    if (draftShifts.length === 0) return;
    setPublishing(true);
    try {
      // Publish all draft shifts in parallel
      const results = await Promise.allSettled(
        draftShifts.map((shift) =>
          fetch(`/api/shifts/${shift.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished: true }),
          })
        )
      );

      const succeeded = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        toast.warning(`Published ${succeeded} shifts, ${failed} failed`);
      } else {
        toast.success(`Published ${succeeded} shift${succeeded > 1 ? "s" : ""}`);
      }
      onPublished();
    } catch {
      toast.error("Failed to publish shifts");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      {draftShifts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {publishedShifts.length} published
              </span>
            </div>
            <div className="flex items-center gap-2">
              <EyeOff className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {draftShifts.length} draft{draftShifts.length !== 1 && "s"}
              </span>
            </div>
            {understaffedDrafts.length > 0 && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]">
                {understaffedDrafts.length} understaffed
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={handlePublishAll}
            disabled={publishing}
          >
            {publishing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Publish {draftShifts.length} Shift
            {draftShifts.length !== 1 && "s"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

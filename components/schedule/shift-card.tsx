"use client";

import { format } from "date-fns";
import { Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatTimeRange } from "@/lib/timezone";

// ─── Skill color map ─────────────────────────────────────

const skillColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  BARTENDER: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  LINE_COOK: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  SERVER: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  HOST: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
  },
};

function getSkillColor(skill: string) {
  return (
    skillColors[skill] ?? {
      bg: "bg-muted",
      text: "text-foreground",
      border: "border-border",
    }
  );
}

function formatSkillLabel(skill: string) {
  return skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Types ───────────────────────────────────────────────

export interface ShiftData {
  id: string;
  locationId: string;
  requiredSkill: string;
  headcount: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  isPremium: boolean;
  location: { id: string; name: string; timezone: string };
  assignments: {
    id: string;
    profileId: string;
    profile: { id: string; name: string; email: string };
  }[];
}

interface ShiftCardProps {
  shift: ShiftData;
  isHighlighted?: boolean;
  onClick?: () => void;
  /** Index for staggered entrance animation */
  staggerIndex?: number;
}

// ─── Component ───────────────────────────────────────────

export function ShiftCard({ shift, isHighlighted, onClick, staggerIndex = 0 }: ShiftCardProps) {
  const colors = getSkillColor(shift.requiredSkill);
  const assignedCount = shift.assignments.length;
  const isFilled = assignedCount >= shift.headcount;
  const tz = shift.location.timezone ?? "UTC";
  const timeRange = formatTimeRange(shift.startTime, shift.endTime, tz);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(isHighlighted
          ? {
              boxShadow: [
                "0 0 0 0px hsl(201 66% 58% / 0)",
                "0 0 0 3px hsl(201 66% 58% / 0.3)",
                "0 0 0 0px hsl(201 66% 58% / 0)",
              ],
            }
          : {}),
      }}
      transition={{
        layout: { duration: 0.2 },
        opacity: { duration: 0.2, delay: staggerIndex * 0.04 },
        scale: { duration: 0.2, delay: staggerIndex * 0.04 },
        boxShadow: { duration: 1.5, repeat: isHighlighted ? 2 : 0 },
      }}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-2.5 cursor-pointer transition-all hover:shadow-md group",
        colors.bg,
        colors.border,
        !shift.isPublished && "border-dashed opacity-75"
      )}
    >
      {/* Header: skill badge + premium */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0 h-4", colors.text, colors.border)}
        >
          {formatSkillLabel(shift.requiredSkill)}
        </Badge>
        {shift.isPremium && (
          <Star className="size-3 text-yellow-500 fill-yellow-500" />
        )}
        {!shift.isPublished && (
          <span className="text-[10px] text-muted-foreground italic">
            Draft
          </span>
        )}
      </div>

      {/* Time */}
      <p className="text-[11px] font-medium text-foreground/80 mb-1.5">
        {timeRange}
      </p>

      {/* Staffing indicator */}
      <div className="flex items-center gap-1.5">
        <Users className="size-3 text-muted-foreground" />
        <span
          className={cn(
            "text-[11px] font-medium",
            isFilled
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        >
          {assignedCount}/{shift.headcount}
        </span>
        {/* Mini avatar stack */}
        {shift.assignments.length > 0 && (
          <div className="flex -space-x-1.5 ml-1">
            {shift.assignments.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="size-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center border border-background"
                title={a.profile.name}
              >
                {a.profile.name[0]}
              </div>
            ))}
            {shift.assignments.length > 3 && (
              <div className="size-4 rounded-full bg-muted text-muted-foreground text-[8px] font-bold flex items-center justify-center border border-background">
                +{shift.assignments.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export { getSkillColor, formatSkillLabel };

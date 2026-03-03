"use client";

import { motion } from "framer-motion";
import {
  CalendarX2,
  Inbox,
  UserX,
  MapPinOff,
  BarChart3,
  ScrollText,
  Clock,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Preset Illustrations ────────────────────────────────

const presets: Record<string, { icon: LucideIcon; defaultMessage: string }> = {
  schedule: {
    icon: CalendarX2,
    defaultMessage: "No shifts scheduled for this period.",
  },
  notifications: {
    icon: Inbox,
    defaultMessage: "No notifications yet.",
  },
  staff: {
    icon: UserX,
    defaultMessage: "No staff members found.",
  },
  locations: {
    icon: MapPinOff,
    defaultMessage: "No locations added yet.",
  },
  analytics: {
    icon: BarChart3,
    defaultMessage: "No analytics data available.",
  },
  audit: {
    icon: ScrollText,
    defaultMessage: "No audit entries found.",
  },
  availability: {
    icon: Clock,
    defaultMessage: "No availability set.",
  },
  swaps: {
    icon: ArrowLeftRight,
    defaultMessage: "No swap requests.",
  },
};

// ─── Types ───────────────────────────────────────────────

interface EmptyStateProps {
  /** Use a preset or provide a custom icon */
  preset?: keyof typeof presets;
  icon?: LucideIcon;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

// ─── Component ───────────────────────────────────────────

export function EmptyState({
  preset,
  icon: customIcon,
  title,
  message,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const presetConfig = preset ? presets[preset] : null;
  const Icon = customIcon ?? presetConfig?.icon ?? Inbox;
  const text = message ?? presetConfig?.defaultMessage ?? "Nothing here yet.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-2" : "py-16 gap-3",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className={cn(
          "rounded-xl bg-muted/50 flex items-center justify-center",
          compact ? "size-12" : "size-16"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground/40",
            compact ? "size-6" : "size-8"
          )}
        />
      </motion.div>

      {title && (
        <h3
          className={cn(
            "font-semibold font-display text-foreground",
            compact ? "text-sm" : "text-base"
          )}
        >
          {title}
        </h3>
      )}

      <p
        className={cn(
          "text-muted-foreground max-w-xs",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {text}
      </p>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            size={compact ? "xs" : "sm"}
            variant="outline"
            onClick={action.onClick}
            className="mt-1"
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { useNotifications } from "@/lib/hooks/useNotification";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

// Shake keyframes for the bell icon
const shakeVariants = {
  idle: { rotate: 0 },
  shake: {
    rotate: [0, -15, 12, -10, 8, -5, 3, 0],
    transition: { duration: 0.6, ease: "easeInOut" as const },
  },
};

export function NotificationBell() {
  const { profile } = useDashboard();
  const { notifications, unreadCount, markAllRead } = useNotifications(
    profile.id
  );

  // Track previous unread count to detect new notifications
  const prevCountRef = useRef(unreadCount);
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 700);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <motion.div
            variants={shakeVariants}
            animate={shouldShake ? "shake" : "idle"}
            onAnimationComplete={() => {
              setShouldShake(false);
              prevCountRef.current = unreadCount;
            }}
          >
            <Bell className="size-4" />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-destructive text-[10px] font-bold text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary font-normal hover:underline"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "flex flex-col items-start gap-1 px-3 py-2.5 cursor-pointer",
                  !n.isRead && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.isRead && (
                    <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {n.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">
                  {n.body}
                </p>
                <span className="text-[10px] text-muted-foreground/60 pl-3.5">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

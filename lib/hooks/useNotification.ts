// lib/hooks/useNotifications.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  shiftId: string | null;
  swapId: string | null;
  createdAt: string;
}

/**
 * Drives the notification bell in the nav bar.
 *
 * New notifications appear instantly without polling —
 * Supabase Realtime fires when a new row is inserted
 * into the Notification table for this user.
 */
export function useNotifications(profileId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const json = await res.json();
    if (json.success) setNotifications(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Only subscribe to notifications for THIS user
  useRealtimeSubscription({
    table: "Notification",
    event: "INSERT",
    filter: `profileId=eq.${profileId}`,
    onchange: (payload) => {
      // Prepend the new notification directly — no need to refetch
      const newNotification = payload.new as Notification;
      setNotifications((prev) => [newNotification, ...prev]);
    },
  });

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, loading, unreadCount, markAllRead };
}
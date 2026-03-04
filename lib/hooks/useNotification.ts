// lib/hooks/useNotifications.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const queryKey = ["notifications", profileId] as const;

  const { data: notifications = [], isLoading: loading } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load notifications");
      }

      return json.data;
    },
  });

  // Only subscribe to notifications for THIS user
  useRealtimeSubscription({
    table: "Notification",
    event: "INSERT",
    filter: `profileId=eq.${profileId}`,
    onchange: (payload) => {
      const newNotification = payload.new as Notification;
      queryClient.setQueryData<Notification[]>(queryKey, (prev = []) => [
        newNotification,
        ...prev,
      ]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(queryKey, (prev = []) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    },
  });

  const markAllRead = () => {
    markAllReadMutation.mutate();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, loading, unreadCount, markAllRead };
}
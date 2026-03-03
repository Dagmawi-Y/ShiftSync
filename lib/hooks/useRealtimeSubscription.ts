"use client";

import { createClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

type Table =
  | "Shift"
  | "ShiftAssignment"
  | "SwapRequest"
  | "Notification"
  | "Profile";

type Event = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubscriptionOptions {
  table: Table;
  event?: Event;
  // Optional filter e.g. "locationId=eq.abc123"
  filter?: string;
  onchange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Base real-time hook. Every feature-specific hook builds on this.
 *
 * How it works:
 * 1. Creates a Supabase channel on mount
 * 2. Listens to Postgres row changes on the specified table
 * 3. Calls onchange whenever a matching row change occurs
 * 4. Cleans up the channel on unmount — prevents memory leaks
 *
 * Important: onchange is wrapped in a ref so the subscription
 * doesn't restart every render when the callback changes.
 */
export function useRealtimeSubscription({
  table,
  event = "*",
  filter,
  onchange,
}: SubscriptionOptions) {
  const supabase = createClient();
  const onchangeRef = useRef(onchange);

  // Keep ref in sync without re-subscribing
  useEffect(() => {
    onchangeRef.current = onchange;
  }, [onchange]);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes-${filter ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => onchangeRef.current(payload)
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  // Only re-subscribe if table, event, or filter changes
  }, [table, event, filter]);
}
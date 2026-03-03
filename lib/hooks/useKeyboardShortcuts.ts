"use client";

import { useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────

interface ShortcutConfig {
  key: string;
  /** Require Cmd/Ctrl modifier */
  meta?: boolean;
  /** Require Shift modifier */
  shift?: boolean;
  /** Callback when triggered */
  handler: () => void;
  /** Prevent when focus is in an input/textarea/select */
  ignoreWhenEditing?: boolean;
}

// ─── Hook ────────────────────────────────────────────────

/**
 * Register keyboard shortcuts that are automatically cleaned up.
 * By default, shortcuts are ignored when a text input is focused.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ignoreEditing = shortcut.ignoreWhenEditing ?? true;
        if (ignoreEditing && isEditing) continue;

        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && metaMatch && shiftMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

// lib/timezone.ts
// Utility for displaying times in a location's timezone
// All shift times are stored in UTC. This converts for display.

import { format as fnsFormat } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Format a UTC date in the given IANA timezone.
 *
 * @param utcDate - a Date or ISO string in UTC
 * @param timezone - IANA timezone (e.g. "America/New_York")
 * @param formatStr - date-fns format string (default: "h:mm a")
 */
export function formatInTimezone(
  utcDate: Date | string,
  timezone: string,
  formatStr: string = "h:mm a"
): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  const zoned = toZonedTime(date, timezone);
  return fnsFormat(zoned, formatStr);
}

/**
 * Get a time range string like "9:00 AM – 5:00 PM" in a location's timezone.
 */
export function formatTimeRange(
  start: Date | string,
  end: Date | string,
  timezone: string
): string {
  return `${formatInTimezone(start, timezone, "h:mm a")} – ${formatInTimezone(end, timezone, "h:mm a")}`;
}

/**
 * Get a full date + time label like "Mon, Mar 3 · 9:00 AM – 5:00 PM" in location TZ.
 */
export function formatShiftLabel(
  start: Date | string,
  end: Date | string,
  timezone: string
): string {
  const date = formatInTimezone(start, timezone, "EEE, MMM d");
  const range = formatTimeRange(start, end, timezone);
  return `${date} · ${range}`;
}

/**
 * Short timezone abbreviation for display, e.g. "PST", "EST".
 * Uses Intl.DateTimeFormat so the result is independent of the server's
 * system timezone.
 */
export function getTimezoneAbbr(
  utcDate: Date | string,
  timezone: string
): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timezone;
}

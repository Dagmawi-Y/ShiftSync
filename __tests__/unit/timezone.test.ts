import { describe, it, expect } from "vitest";
import {
  formatInTimezone,
  formatTimeRange,
  formatShiftLabel,
  getTimezoneAbbr,
} from "@/lib/timezone";

// ─── Test data ──────────────────────────────────────────
// 2026-03-03T17:00:00Z = March 3, 2026 5:00 PM UTC
// In America/New_York (EST, UTC-5): 12:00 PM
// In America/Los_Angeles (PST, UTC-8): 9:00 AM
const UTC_START = new Date("2026-03-03T17:00:00Z");
const UTC_END = new Date("2026-03-03T23:00:00Z");

describe("formatInTimezone", () => {
  it("converts UTC to Eastern time", () => {
    const result = formatInTimezone(UTC_START, "America/New_York");
    expect(result).toBe("12:00 PM");
  });

  it("converts UTC to Pacific time", () => {
    const result = formatInTimezone(UTC_START, "America/Los_Angeles");
    expect(result).toBe("9:00 AM");
  });

  it("accepts ISO string input", () => {
    const result = formatInTimezone("2026-03-03T17:00:00Z", "America/New_York");
    expect(result).toBe("12:00 PM");
  });

  it("uses custom format string", () => {
    const result = formatInTimezone(UTC_START, "America/New_York", "HH:mm");
    expect(result).toBe("12:00");
  });

  it("handles midnight correctly", () => {
    const midnight = new Date("2026-03-04T05:00:00Z"); // midnight EST
    const result = formatInTimezone(midnight, "America/New_York");
    expect(result).toBe("12:00 AM");
  });

  it("handles UTC timezone", () => {
    const result = formatInTimezone(UTC_START, "UTC");
    expect(result).toBe("5:00 PM");
  });
});

describe("formatTimeRange", () => {
  it("formats a standard day shift in Eastern", () => {
    const result = formatTimeRange(UTC_START, UTC_END, "America/New_York");
    expect(result).toBe("12:00 PM – 6:00 PM");
  });

  it("formats a standard day shift in Pacific", () => {
    const result = formatTimeRange(UTC_START, UTC_END, "America/Los_Angeles");
    expect(result).toBe("9:00 AM – 3:00 PM");
  });

  it("accepts ISO string inputs", () => {
    const result = formatTimeRange(
      "2026-03-03T17:00:00Z",
      "2026-03-03T23:00:00Z",
      "America/New_York"
    );
    expect(result).toBe("12:00 PM – 6:00 PM");
  });

  it("handles overnight shifts correctly", () => {
    // 10 PM to 6 AM next day (EST)
    const start = new Date("2026-03-04T03:00:00Z"); // 10 PM EST
    const end = new Date("2026-03-04T11:00:00Z"); // 6 AM EST next morning
    const result = formatTimeRange(start, end, "America/New_York");
    expect(result).toBe("10:00 PM – 6:00 AM");
  });
});

describe("formatShiftLabel", () => {
  it("includes day, date, and time range", () => {
    const result = formatShiftLabel(UTC_START, UTC_END, "America/New_York");
    expect(result).toBe("Tue, Mar 3 · 12:00 PM – 6:00 PM");
  });

  it("shows correct day of week in Pacific", () => {
    const result = formatShiftLabel(UTC_START, UTC_END, "America/Los_Angeles");
    expect(result).toBe("Tue, Mar 3 · 9:00 AM – 3:00 PM");
  });

  it("handles timezone where date differs from UTC", () => {
    // 2026-03-04T02:00:00Z in Pacific = March 3, 6:00 PM
    const late = new Date("2026-03-04T02:00:00Z");
    const lateEnd = new Date("2026-03-04T06:00:00Z"); // 10 PM PST
    const result = formatShiftLabel(late, lateEnd, "America/Los_Angeles");
    expect(result).toBe("Tue, Mar 3 · 6:00 PM – 10:00 PM");
  });
});

describe("getTimezoneAbbr", () => {
  it("returns EST for Eastern in winter", () => {
    const result = getTimezoneAbbr(UTC_START, "America/New_York");
    expect(result).toBe("EST");
  });

  it("returns PST for Pacific in winter", () => {
    const result = getTimezoneAbbr(UTC_START, "America/Los_Angeles");
    expect(result).toBe("PST");
  });

  it("returns UTC for UTC timezone", () => {
    const result = getTimezoneAbbr(UTC_START, "UTC");
    expect(result).toBe("UTC");
  });

  it("accepts ISO string input", () => {
    const result = getTimezoneAbbr("2026-03-03T17:00:00Z", "America/New_York");
    expect(result).toBe("EST");
  });

  it("returns EDT during daylight saving time", () => {
    // July 1 — DST is active in Eastern
    const summer = new Date("2026-07-01T17:00:00Z");
    const result = getTimezoneAbbr(summer, "America/New_York");
    expect(result).toBe("EDT");
  });
});
